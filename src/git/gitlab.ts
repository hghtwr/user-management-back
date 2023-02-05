import { Gitlab, Types } from "@gitbeaker/node"; // All Resources
import fs from "fs";
import "dotenv/config";
import * as path from "path";
import { MemberSchema } from "@gitbeaker/core/dist/types/types";
import { oBaseLogger } from "../logger.js";
interface GitConfig {
  host: string;
  token: string;
}
interface MyGroupSchema extends Types.GroupDetailSchema {
  type: string;
}

class MyGitlab extends Gitlab {
  topLevelGroup: number;
  entities: (MyGroupSchema | Types.ProjectSchema)[];

  constructor(config: GitConfig, topLevelGroup: number) {
    super(config);
    this.topLevelGroup = topLevelGroup;
  }
  getEntityById(id: number) {
    return this.entities.filter((entity) => {
      return entity.id == id;
    });
  }

  async getEntityUsers(id: number) {
    let entity = this.getEntityById(id)[0];
    if (entity.type == "group") {
      return await this.GroupMembers.all(id);
    } else {
      return await this.ProjectMembers.all(id);
    }
  }

  getAllUsers() {}

  async updateFileTree() {
    oBaseLogger.info("Starting file tree update");
    this.entities = await this.getEntities();
    oBaseLogger.info("Finished file tree update");
  }

  getFileTree() {
    return this.entities;
  }

  async getEntities(): Promise<(MyGroupSchema | Types.ProjectSchema)[]> {
    let topLevelGroup = await this.Groups.show(this.topLevelGroup);
    let subgroups = await this.getSubGroup(this.topLevelGroup);
    let projects = await this.Groups.projects(this.topLevelGroup);

    projects = projects.map((project) => {
      project.type = "project";
      return project;
    });
    let allGroups: MyGroupSchema[] = [topLevelGroup, ...subgroups].map(
      (group: MyGroupSchema) => {
        group.type = "group";
        return group as MyGroupSchema;
      }
    );
    return [...projects, ...allGroups];
  }

  async getSubGroup(groupId: number): Promise<Types.GroupDetailSchema[]> {
    const groups: Record<string, unknown> = await this.Groups.subgroups(
      groupId
    );
    const groupArray: Types.GroupDetailSchema[] = [];

    for (let i = 0; i < groups.length; i++) {
      const group: Types.GroupDetailSchema = groups[
        i
      ] as Types.GroupDetailSchema;
      groupArray.push(group);

      groupArray.push(...(await this.getSubGroup(group.id)));
    }
    return groupArray;
  }
}

export { MyGitlab as Gitlab, GitConfig as GitConfig };

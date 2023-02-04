import { Gitlab, Types } from "@gitbeaker/node"; // All Resources
import fs from "fs";
import "dotenv/config";
import * as path from "path";
import { MemberSchema } from "@gitbeaker/core/dist/types/types";

interface GitConfig {
  host: string;
  token: string;
}

class MyGitlab extends Gitlab {
  topLevelGroup: number;
  entities: {
    projects: Types.ProjectSchema[];
    groups: Types.GroupDetailSchema[];
  };

  constructor(config: GitConfig, topLevelGroup: number) {
    super(config);
    this.topLevelGroup = topLevelGroup;
  }

  async updateFileTree() {
    console.log("Loading groups/projects...");
    this.entities = await this.getEntities();
  }

  getFileTree() {
    const groups = this.entities.groups.map((entity) => {
      return {
        path: entity.full_path,
        id: entity.id,
        type: "group",
      };
    });
    const projects = this.entities.projects.map((entity) => {
      return {
        path: entity.path_with_namespace,
        id: entity.id,
        type: "project",
      };
    });
    return [...groups, ...projects];
  }

  async getEntities(): Promise<{
    projects: Types.ProjectSchema[];
    groups: Types.GroupDetailSchema[];
  }> {
    const topLevelGroup: Types.GroupDetailSchema = await this.Groups.show(
      this.topLevelGroup
    );
    const subgroups: Types.GroupDetailSchema[] = await this.getSubGroup(
      this.topLevelGroup
    );
    const projects: Types.ProjectSchema[] = await this.Groups.projects(
      this.topLevelGroup
    );
    return {
      projects: [...projects],
      groups: [topLevelGroup, ...subgroups],
    };
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

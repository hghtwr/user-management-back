import { Gitlab, Types } from "@gitbeaker/node"; // All Resources
import fs from "fs";
import "dotenv/config";
import * as path from "path";

interface GitConfig {
  host: string;
  token: string;
}

class MyGitlab extends Gitlab {
  topLevelGroup: number;

  constructor(config: GitConfig, topLevelGroup: number) {
    super(config);
    this.topLevelGroup = topLevelGroup;
  }

  /**
   * Should sync the repos and create the according .groups .project files to keep the state up.
   * Should automatically run during startup of the api.
   */
  async sync_repos() {
    const entities = await this.getGroups();

    entities.groups.forEach((item: Types.GroupDetailSchema) => {
      try {
        fs.mkdirSync(this.getFolderPath(item.full_path), { recursive: true });
      } catch (error) {
        console.error(error);
      }
    });
  }

  getFolderPath(pathString: string): fs.PathLike {
    let paths: string[] = pathString.split("/");
    paths = paths.slice(0, paths.length);
    return path.join(...paths);
  }

  async getGroups() {
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
      projects,
      groups: [topLevelGroup, ...subgroups],
    };
  }

  /**
   * Recursively loops through groups to deliver the subgroups in one big array
   */
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

export { MyGitlab as Gitlab };

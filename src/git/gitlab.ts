import { Gitlab, Types } from "@gitbeaker/node"; // All Resources

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
    let entities = await this.getGroups();
    console.log(entities);
  }

  async getGroups() {
    let topLevelGroup: Types.GroupDetailSchema = await this.Groups.show(
      this.topLevelGroup
    );
    let subgroups: Types.GroupDetailSchema[] = await this.getSubGroup(
      this.topLevelGroup
    );
    let projects: Types.ProjectSchema[] = await this.Groups.projects(
      this.topLevelGroup
    );
    return [
      {
        projects: projects,
        groups: [topLevelGroup, ...subgroups],
      },
    ];
  }

  /**
   * Recursively loops through groups to deliver the subgroups in one big array
   */
  async getSubGroup(groupId: number): Promise<Types.GroupDetailSchema[]> {
    let groups: Record<string, unknown> = await this.Groups.subgroups(groupId);
    let groupArray: Types.GroupDetailSchema[] = [];

    for (let i = 0; i < groups.length; i++) {
      let group: Types.GroupDetailSchema = groups[i] as Types.GroupDetailSchema;
      groupArray.push(group);
      groupArray.push(...(await this.getSubGroup(group.id)));
    }
    return groupArray;
  }
}

export { MyGitlab as Gitlab };

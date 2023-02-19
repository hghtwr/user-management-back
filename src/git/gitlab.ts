import { Gitlab, Types } from "@gitbeaker/node"; // All Resources
import fs from "fs";
import "dotenv/config";
import * as path from "path";
import {
  GroupDetailSchema,
  MemberSchema,
  ProjectSchema,
} from "@gitbeaker/core/dist/types/types";
import { oBaseLogger } from "../logger.js";
interface GitConfig {
  host: string;
  token: string;
}
interface MyGroupSchema extends Types.GroupDetailSchema {
  type: string;
  subgroups: MyGroupSchema[];
}
interface MyFileTreeSchema {
  name: string;
  type: string;
  children: MyFileTreeSchema[];
}
export interface MyUserSchema {
  user: MemberSchema;
  //usergroups: [{ id: number; access_level: number }];
  usergroups: [{ id: number; userInfo: Types.MemberSchema }];
}
class MyGitlab extends Gitlab {
  topLevelGroup: number;
  entities: (MyGroupSchema | Types.ProjectSchema)[];
  users: MyUserSchema[];
  orderedEntities: MyFileTreeSchema;
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
      return {
        id: id,
        //entity: entity,
        users: await this.GroupMembers.all(id),
      };
    } else {
      return {
        id: id,
        //entity: entity,
        users: await this.ProjectMembers.all(id),
      };
    }
  }

  // TO-DO: MAke this to be executed once in the beginning and then synced on demand.
  // TO-DO: Extend usergroups to also have the rest of the user information as this could be different, e.g. expires at

  async syncAllUsers() {
    oBaseLogger.info("Starting user update");

    let promises: Promise<Types.MemberSchema[]>[] = [];
    for (let i = 0; i < this.entities.length; i++) {
      if (this.entities[i].type == "group") {
        promises.push(this.GroupMembers.all(this.entities[i].id));
      } else {
        promises.push(this.ProjectMembers.all(this.entities[i].id));
      }
    }
    let groupUsers: MemberSchema[][] = await Promise.all(promises);

    //Need to pivot the entites from groups --> user to user --> groups
    let users: MyUserSchema[] = [];
    //Check the received groups one after another
    for (let j = 0; j < groupUsers.length; j++) {
      //Loop over the users in the response
      for (let k = 0; k < groupUsers[j].length; k++) {
        // Check if user already exists
        let existingUser = users.filter((item) => {
          return item.user.username == groupUsers[j][k].username;
        });
        if (existingUser.length > 0) {
          existingUser[0].usergroups.push({
            id: this.entities[j].id,
            userInfo: groupUsers[j][k],
            //access_level: groupUsers[j][k].access_level,
          });
        } else {
          users.push({
            user: groupUsers[j][k],
            usergroups: [
              {
                id: this.entities[j].id,
                userInfo: groupUsers[j][k],
                //access_level: groupUsers[j][k].access_level,
              },
            ],
          });
        }
      }
    }
    this.users = users;
    oBaseLogger.info("Finished user update");
  }

  async updateFileTree() {
    oBaseLogger.info("Starting file tree update");
    this.entities = await this.getEntities();
    oBaseLogger.info("Finished file tree update");
  }

  getAllUsers() {
    return this.users;
  }
  getFileTree() {
    return this.entities;
  }
  getOrderedEntities() {
    return this.orderedEntities;
  }

  async getEntities(): Promise<(MyGroupSchema | Types.ProjectSchema)[]> {
    let topLevelGroup = this.Groups.show(this.topLevelGroup);
    let subgroups = this.getSubGroups(this.topLevelGroup);
    //let subgroups = this.getOrderedSubgroups(this.topLevelGroup);
    let projects = this.Groups.projects(this.topLevelGroup);
    let tlgData = await topLevelGroup;
    let subGroupData = await subgroups;
    let projectData = await projects;

    projectData = projectData.map((project) => {
      project.type = "project";
      return project;
    });
    let allGroups: MyGroupSchema[] = [tlgData, ...subGroupData].map(
      (group: MyGroupSchema) => {
        group.type = "group";
        return group as MyGroupSchema;
      }
    );
    return [...projectData, ...allGroups];
  }

  orderEntities() {
    const topLevelGroup = this.entities.filter((entity) => {
      return entity.id == this.topLevelGroup;
    })[0] as MyGroupSchema;
    const orderedSubgroups = this.parseFileTree(
      this.getChild(
        this.entities.filter((entity) => {
          return entity.id == topLevelGroup.id;
        })[0] as MyGroupSchema
      )
    );
    this.orderedEntities = {
      name: topLevelGroup.full_name,
      type: "group",
      children: orderedSubgroups,
    };
  }

  parseFileTree(groups: (MyGroupSchema | Types.ProjectSchema)[]) {
    let results: MyFileTreeSchema[] = [];
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].type == "group") {
        const group = groups[i] as MyGroupSchema;
        results.push({
          name: group.name,
          type: "group",
          children: this.parseFileTree(group.subgroups),
        });
      } else {
        const project = groups[i] as Types.ProjectSchema;
        results.push({
          name: project.name,
          type: "project",
          children: [],
        });
      }
    }
    return results;
  }

  getChild(group: MyGroupSchema): (MyGroupSchema | Types.ProjectSchema)[] {
    const childs = this.entities.filter((entity) => {
      if (entity.type == "group") {
        entity = entity as MyGroupSchema;
        const groupLevel = group.full_path.split("/"); // Get the level of the parentgroup by / --> group/subgroup/subsubgroup ==> 3
        return (
          entity.full_path.startsWith(group.full_path) &&
          entity.full_path.split("/").length == groupLevel.length + 1 // only select the next lower level, otherwise stackOverflow...
        ); // childrens fullpath is longer than parents --> startsWith
      } else {
        entity = entity as ProjectSchema;
        return entity.path_with_namespace.startsWith(group.full_path);
      }
    });

    for (let i = 0; i < childs.length; i++) {
      if (childs[i].type == "group") {
        // Projects are always lowest hierachie and do not have any subelements
        childs[i].subgroups = this.getChild(childs[i] as MyGroupSchema);
      }
    }
    return childs;
  }
  /* Just takes too long for larger amount of entities...

  async getOrderedSubgroups(groupId: number) {
    const subgroups = await this.Groups.subgroups(groupId);
    const groupPromises = [];
    let fetchedGroups: MyGroupSchema[] = []; // Group of the current level, already fetched

    for (let i = 0; i < subgroups.length; i++) {
      const group = subgroups[i] as MyGroupSchema;
      groupPromises.push();
      let groups: MyGroupSchema[] = await this.getOrderedSubgroups(group.id);
      group.subgroups = groups;
      fetchedGroups.push(group);
    }
    return fetchedGroups;
  }
*/
  async getSubGroups(groupId: number): Promise<any> {
    const subgroups = await this.Groups.subgroups(groupId);
    let groupPromises = []; // subgroups to be fetched
    let promisedGroups = []; // Group of the current level, already fetched
    for (let i = 0; i < subgroups.length; i++) {
      const group = subgroups[i] as Types.GroupDetailSchema;
      promisedGroups.push(group);
      groupPromises.push(this.getSubGroups(group.id)); //recursive call to fetch subgroups
    }
    let groups = await (
      await Promise.all(groupPromises)
    )
      .filter((item) => {
        return item.length > 0; // filter for groups without children at the bottom of the tree
      })
      .flat(Infinity); // make it flat as Promise.all will return nested arrays
    if (groups.length > 0) {
      return [...promisedGroups, ...groups]; // spread everything out, to combine them
    } else {
      return [...promisedGroups];
    }
  }
  getUserGroups(userId: number): MyUserSchema {
    return this.users.filter((user) => {
      return user.user.id == userId;
    })[0];
  }
}

export { MyGitlab as Gitlab, GitConfig as GitConfig };

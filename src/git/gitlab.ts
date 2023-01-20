import { Gitlab } from "@gitbeaker/node"; // All Resources

interface GitConfig {
  host: string;
  token: string;
}

class MyGitlab extends Gitlab {
  constructor(config: GitConfig) {
    super(config);
  }
}

export { MyGitlab as Gitlab };

/** 工具注册入口:导入即注册;新增工具模块后在此追加一行即可被模型看到。 */

import { registerKnowledgeTool } from "./knowledge.js";
import { registerMeetingTools } from "./meetings.js";
import { registerPeopleTools } from "./people.js";
import { registerProjectTools } from "./projects.js";

export function registerAllTools(): void {
    registerKnowledgeTool();
    registerMeetingTools();
    registerProjectTools();
    registerPeopleTools();
}

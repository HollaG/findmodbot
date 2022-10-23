"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
console.log("Running file");
const dotenv_1 = __importDefault(require("dotenv"));
const node_fetch_1 = __importDefault(require("node-fetch"));
dotenv_1.default.config();
const bot = new telegraf_1.Telegraf(process.env.BOT_TOKEN);
bot.start((ctx) => {
    ctx.reply("Hello " + ctx.from.first_name + "!");
});
bot.help((ctx) => {
    ctx.reply("Send /start to receive a greeting");
    ctx.reply("Send /keyboard to receive a message with a keyboard");
    ctx.reply("Send /quit to stop the bot");
});
bot.command("quit", (ctx) => {
    // Explicit usage
    ctx.telegram.leaveChat(ctx.message.chat.id);
    // Context shortcut
    ctx.leaveChat();
});
bot.command("keyboard", (ctx) => {
    ctx.reply("Keyboard", telegraf_1.Markup.inlineKeyboard([
        telegraf_1.Markup.button.callback("First option", "first"),
        telegraf_1.Markup.button.callback("Second option", "second"),
    ]));
});
bot.on("text", (ctx) => {
    ctx.reply("You choose the " +
        (ctx.message.text === "first" ? "First" : "Second") +
        " Option!");
});
bot.on("inline_query", async (ctx) => {
    const query = ctx.inlineQuery.query.trim().toUpperCase();
    if (query.length < 2)
        return;
    const moduleListResponse = await (0, node_fetch_1.default)("https://api.nusmods.com/v2/2022-2023/moduleList.json");
    const moduleList = await moduleListResponse.json();
    const filteredList = moduleList.filter((module) => module.moduleCode.toUpperCase().includes(query) || module.title.toUpperCase().includes(query));
    // lowest moduleCode number first
    const sortedList = filteredList.sort((a, b) => {
        // remove all non-numeric characters
        const aCode = a.moduleCode.replace(/\D/g, "");
        const bCode = b.moduleCode.replace(/\D/g, "");
        return parseInt(aCode) - parseInt(bCode);
    });
    console.log(sortedList);
    const result = sortedList.map((module) => {
        return {
            type: "article",
            id: module.moduleCode,
            title: `${module.moduleCode} - ${module.title}`,
            input_message_content: {
                message_text: `${module.moduleCode} - ${module.title}`
            }
        };
    });
    // limit results to 50.
    const trimmedResults = result.slice(0, 50);
    ctx.answerInlineQuery(trimmedResults, {
        cache_time: 0 // to change
    });
});
bot.launch();
//# sourceMappingURL=app.js.map
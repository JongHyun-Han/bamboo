import {
  AllMiddlewareArgs,
  App,
  GlobalShortcut,
  PlainTextOption,
  SlackShortcutMiddlewareArgs,
  SlackViewAction,
  SlackViewMiddlewareArgs,
  ViewSubmitAction,
} from "@slack/bolt";
import { sendMessage } from "../utils/chat";
import { SLACK_BAMBOO_CHANNEL, SLACK_BOT_TOKEN } from "../utils/env";
import { getRandomName } from "../utils/names";

const IDENTIFIER = "bamboo_message" as const;

const openMessageModal = async ({
  shortcut,
  ack,
  client,
  logger,
}: SlackShortcutMiddlewareArgs<GlobalShortcut> & AllMiddlewareArgs) => {
  try {
    await ack();

    const result = await client.views.open({
      trigger_id: shortcut.trigger_id,
      view: {
        type: "modal",
        callback_id: IDENTIFIER,
        title: {
          type: "plain_text",
          text: "Bamboo Forest",
          emoji: true,
        },
        submit: {
          type: "plain_text",
          text: "Submit",
          emoji: true,
        },
        close: {
          type: "plain_text",
          text: "Cancel",
          emoji: true,
        },
        blocks: [
          {
            type: "input",
            block_id: "#channels",
            element: {
              type: "conversations_select",
              placeholder: {
                type: "plain_text",
                text: "채널을 선택하세요",
                emoji: true,
              },
              action_id: "#channel",
            },
            label: {
              type: "plain_text",
              text: "채널 선택",
              emoji: true,
            },
          },
          {
            type: "input",
            block_id: `#content`,
            element: {
              type: "plain_text_input",
              multiline: true,
              placeholder: {
                type: "plain_text",
                text: "채널에 전송되는 메시지입니다.",
                emoji: true,
              },
              action_id: `#message`,
              focus_on_load: true,
            },
            label: {
              type: "plain_text",
              text: "새 메시지 입력",
              emoji: true,
            },
          },
          {
            type: "input",
            block_id: `#name`,
            element: {
              type: "plain_text_input",
              placeholder: {
                type: "plain_text",
                text: "아무것도 입력하지 않으면 익명으로 표시됩니다.",
                emoji: true,
              },
              action_id: `#message`,
            },
            optional: true,
            label: {
              type: "plain_text",
              text: "이름 입력",
              emoji: true,
            },
          },
        ],
      },
    });
    logger.info(result);
  } catch (error) {
    logger.error(error);
  }
};

const responseModal = async ({
  ack,
  view,
  client,
  logger,
}: SlackViewMiddlewareArgs<SlackViewAction> & AllMiddlewareArgs) => {
  try {
    const values = view["state"]["values"];

    const name = values["#name"]["#message"].value ?? getRandomName();
    const message = values[`#content`][`#message`].value ?? "";
    const channel = values[`#channels`][`#channel`].selected_conversation ?? "";

    console.log("channel :>> ", channel);

    const { channels = [] } = await client.users.conversations({
      token: SLACK_BOT_TOKEN,
      types: "public_channel,private_channel",
      exclude_archived: true,
    });

    if (!channels.find((item) => item.id === channel)) {
      await ack({
        response_action: "errors",
        errors: {
          [`#channels`]: "해당 채널에 봇이 초대되어 있지 않습니다.",
        },
      });
      return;
    }

    await ack();
    await sendMessage({
      channel,
      client,
      name,
      message,
    });
  } catch (error) {
    logger.error(error);
  }
};

export const applyBambooMessage = (app: App) => {
  app.shortcut<GlobalShortcut>(IDENTIFIER, openMessageModal);
  app.view<ViewSubmitAction>(IDENTIFIER, responseModal);
};

# koishi-plugin-comfyui-client

[![npm](https://img.shields.io/npm/v/koishi-plugin-comfyui-client?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-comfyui-client)
[![GitHub](https://img.shields.io/github/stars/flymyd/koishi-plugin-comfyui-client?style=flat-square)](https://github.com/flymyd/koishi-plugin-comfyui-client)

一个为 [Koishi](https://koishi.chat/) 设计的 [ComfyUI](https://github.com/comfyanonymous/ComfyUI) 客户端插件。它允许你通过 Koishi 机器人执行任何 ComfyUI 工作流，实现文生图等功能。

## ✨ 功能特性

- **高度可定制**: 支持通过 JSON 加载任意 ComfyUI 工作流。
- **文生图指令**: 提供 `comfy` 指令，方便用户通过文本生成图片。
- **LLM 提示词增强**: 可选集成 OpenAI 兼容的 LLM (如 GPT、Gemini、Kimi) 来优化用户的输入提示词，生成更丰富、更具表现力的图像。
- **安全过滤**: 内置 SFW (Safe for Work) 模式，当使用 LLM 增强时，可自动过滤不当内容。
- **动态连接**: 自动处理与 ComfyUI 服务器的 WebSocket 连接和 HTTP 请求。

## 💿 安装

在 Koishi 插件市场搜索 `comfyui-client` 并安装。

## ⚙️ 配置项

在 Koishi 的插件配置页面填入以下选项：

| 配置项 | 类型 | 默认值 | 描述 |
| --- | --- | --- | --- |
| `serverEndpoint` | `string` | `127.0.0.1:8188` | ComfyUI 服务器地址，格式为 `域名/IP:端口`。 |
| `isSecureConnection` | `boolean` | `false` | 是否使用 `https` 和 `wss` 进行安全连接。 |
| `picOutputNodeID` | `string` | `9` | 在工作流中，最终输出图像的节点 (通常是 `SaveImage` 节点) 的 ID。 |
| `workflowJSON` | `string` (文本域) | (空) | 你的 ComfyUI 工作流的 JSON 字符串。**这是插件的核心配置**。 |
| `LLMSettings` | `object` | - | (可选) LLM 增强设置。 |
| `LLMSettings.enabled` | `boolean` | `false` | 是否启用 LLM 来增强用户输入的提示词。 |
| `LLMSettings.endpoint` | `string` | `https://api.z.ai/api/paas/v4` | OpenAI 兼容的 LLM API 地址。 |
| `LLMSettings.model` | `string` | `glm-4.5-flash` | LLM 模型 ID。 |
| `LLMSettings.key` | `string` | `sk-******` | 你的 LLM API Key。 |
| `LLMSettings.prompt` | `string` (文本域) | (内置提示词) | 用于指导 LLM 生成图像提示词的系统提示 (System Prompt)。 |
| `LLMSettings.isSFW` | `boolean` | `true` | 是否启用安全模式，过滤 R18 内容。 |

---

### 如何获取 `workflowJSON` 和 `picOutputNodeID`

为了让插件知道如何执行你的工作流，你需要从 ComfyUI 导出它。

1.  **在 ComfyUI 中构建你的工作流**。
    -   确保你的工作流中有一个接收正面提示词的 `CLIPTextEncode` 节点。
    -   将该节点的 `text` 输入框内容设置为一个独特的占位符：`114514.1919810`。插件会自动将用户的输入替换到这里。
    -   记下最终生成图像的 `SaveImage` 节点的 ID。你可以在节点标题上看到这个数字。

2.  **导出工作流**。
    -   点击 ComfyUI 界面右侧的 `Save (API Format)` 按钮。
    -   这会导出一个 JSON 文件。

3.  **填入配置**。
    -   用文本编辑器打开刚刚下载的 JSON 文件，**复制所有内容**。
    -   将复制的内容粘贴到插件配置的 `workflowJSON` 文本框中。
    -   将在步骤 1 中记下的 `SaveImage` 节点 ID (例如 `9`) 填入 `picOutputNodeID` 字段。

## 🚀 使用方法

配置完成后，你可以通过以下指令使用插件：

```
comfy <你的提示词>
```

**示例:**

```
comfy a cute cat sitting on a sofa
```

如果开启了 LLM 增强，插件会首先将你的提示词发送给 LLM 进行优化，然后再提交给 ComfyUI 生成图像。

## 📄 许可协议

本项目使用 [MIT](./LICENSE) 许可协议。

## ❤️ 作者

**koishi-plugin-comfyui-client** © [flymyd](https://github.com/flymyd), Released under the MIT License.
Authored and maintained by flymyd.

> GitHub [@flymyd](https://github.com/flymyd) · 夏雪冬花

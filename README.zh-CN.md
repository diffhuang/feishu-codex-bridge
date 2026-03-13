# Feishu Codex Bridge

[English README](./README.md)

Feishu Codex Bridge 是一个本地桥接服务，用于把飞书私聊接到 Codex CLI，并把执行过程限制在可控的本地工作区内。

## 为什么有这个项目

Codex CLI 很适合在本地工作，但默认并不提供一个适合日常协作对话的消息通道。这个项目把飞书私聊变成 Codex 的任务入口，同时保留本地执行的可控边界，而不是把权限直接暴露给一个外部机器人。

桥接层会负责三件事：把“当前请求来自飞书会话”写入给 Codex 的任务上下文，把结果和文件安全地回传到飞书，以及通过 allowlist、工作区根目录和沙箱参数限制运行边界。

## 关键特性

- 飞书通道上下文：在调用 Codex 前注入飞书会话背景，让 Codex 明确当前是在飞书里和用户对话。
- 文件回传：支持通过隐藏的附件协议声明工作区内已有文件，并由桥接层校验后发送回飞书。
- 可控权限边界：通过 `ALLOWED_OPEN_IDS`、`CODEX_WORKSPACE_ROOT`、`CODEX_SANDBOX_MODE` 限制允许访问的用户、可读写目录和执行权限。
- 面向实际使用的桥接能力：支持 `/help`、`/status`、`/reset`、处理中反馈、用户目录日志和可选 verbose 事件日志。

## 环境要求

- Node.js 20 或以上
- npm
- 已安装 Codex CLI，或通过 `CODEX_COMMAND` 指定命令
- 已开启长连接能力的飞书应用

## 运行前准备

第一次运行前，请先确认：

1. `node -v` 可以正常执行。
2. 在同一个终端环境里执行 `codex --help` 是成功的。
3. Codex CLI 已完成登录，并且能在目标工作区正常工作。
4. 你已经拿到 `FEISHU_APP_ID`、`FEISHU_APP_SECRET` 和目标用户的 `open_id`。

建议先做两个本地自检：

```bash
node -v
codex --help
```

如果 `codex --help` 无法执行，桥接服务即使能启动，也无法真正处理任务。

## 工作区路径要求

`CODEX_WORKSPACE_ROOT` 必须满足：

- 指向真实存在的目录
- 路径只能包含 ASCII 字符
- 不要使用最终会回溯到中文路径的符号链接

建议使用类似下面的路径：

```text
/path/to/codex-workspace
```

## 快速开始

### 方式一：源码运行（当前可直接使用）

1. 克隆仓库并进入项目目录：

```bash
git clone https://github.com/diffhuang/feishu-codex-bridge.git
cd feishu-codex-bridge
```

2. 安装依赖：

```bash
npm install
```

3. 复制环境变量模板：

```bash
cp .env.example .env
```

4. 编辑 `.env`，填写飞书应用凭证、允许访问的 open id，以及 Codex 工作区路径。

5. 以开发模式启动桥接服务：

```bash
npm run dev
```

出现类似日志，说明桥接服务已经开始建立飞书长连接：

```text
[bridge] starting long connection for workspace /path/to/codex-workspace
```

### 方式二：全局安装 CLI（npm 发布后可用）

如果这个包已经发布到 npm，可以用下面的方式全局安装：

1. 全局安装：

```bash
npm install -g feishu-codex-bridge
```

2. 创建并进入本地运行目录：

```bash
mkdir feishu-codex-bridge-runtime
cd feishu-codex-bridge-runtime
```

3. 初始化本地 `.env`：

```bash
feishu-codex-bridge init
```

4. 编辑 `.env`，填写飞书应用凭证、允许访问的 open id，以及 Codex 工作区路径。

5. 启动桥接服务：

```bash
feishu-codex-bridge
```

出现类似日志，说明桥接服务已经开始建立飞书长连接：

```text
[bridge] starting long connection for workspace /path/to/codex-workspace
```

## 飞书后台配置

请开启长连接模式，并订阅以下事件：

- `im.message.receive_v1`

请开通当前代码实际需要的 tenant scopes：

- `im:message`
- `im:message.p2p_msg:readonly`
- `im:message:readonly`
- `im:message:send_as_bot`
- `im:message:update`
- `im:message.reactions:write_only`
- `im:resource`

修改权限或事件订阅后，请重新发布并生效一个新的飞书应用版本。

## 环境变量

| 变量名 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `FEISHU_APP_ID` | 是 | 无 | 飞书应用 App ID |
| `FEISHU_APP_SECRET` | 是 | 无 | 飞书应用 App Secret |
| `CODEX_WORKSPACE_ROOT` | 是 | 无 | Codex 执行时使用的固定工作区根目录 |
| `CODEX_COMMAND` | 否 | `codex` | Codex CLI 命令名 |
| `CODEX_SANDBOX_MODE` | 否 | `workspace-write` | 支持 `read-only`、`workspace-write`、`danger-full-access` |
| `CODEX_TIMEOUT_MS` | 否 | `600000` | 单次任务超时时间，单位毫秒 |
| `CODEX_VERBOSE_EVENTS` | 否 | `false` | 是否开启 verbose 事件模式 |
| `CODEX_EXECUTION_TAIL_LINES` | 否 | `20` | verbose 模式下展示的执行输出尾行数 |
| `ALLOWED_OPEN_IDS` | 是 | 无 | 允许访问机器人的飞书用户 `open_id`，多个值用英文逗号分隔 |
| `REPLY_MAX_CHARS` | 否 | `3500` | 单次用户输入的最大字符数 |
| `LOG_LEVEL` | 否 | `info` | 日志级别 |

示例：

```env
FEISHU_APP_ID=
FEISHU_APP_SECRET=
CODEX_WORKSPACE_ROOT=/path/to/codex-workspace
CODEX_COMMAND=codex
CODEX_SANDBOX_MODE=workspace-write
CODEX_TIMEOUT_MS=600000
CODEX_VERBOSE_EVENTS=false
CODEX_EXECUTION_TAIL_LINES=20
ALLOWED_OPEN_IDS=ou_xxx,ou_yyy
REPLY_MAX_CHARS=3500
LOG_LEVEL=info
```

注意事项：

- `CODEX_WORKSPACE_ROOT` 必须是一个真实存在的纯 ASCII 路径目录。
- `.env` 仅用于本地运行，不应提交到版本库。
- `ALLOWED_OPEN_IDS` 使用英文逗号分隔。

## `ALLOWED_OPEN_IDS` 怎么获取

当前项目不会自动发现允许用户，所以你需要提前收集目标用户的 `open_id`。

常见做法：

- 在飞书事件调试数据里查看 `sender.sender_id.open_id`
- 如果你已有其它消息接收服务，也可以从现有日志中提取

## 推荐沙箱设置

建议使用：

```env
CODEX_SANDBOX_MODE=workspace-write
```

这对“读文件、在工作区内改文件、回传已有本地文件”这类场景是最实用的默认值。

## 常用脚本

```bash
npm run dev
npm run build
npm test
npm run typecheck
```

## 桥接命令

- `/help`：查看桥接层支持的命令
- `/status`：查看当前聊天绑定的 Codex 会话
- `/reset`：清除当前聊天绑定的会话，下次普通消息会重新开启新会话

## 任务反馈

对于普通 Codex 任务，桥接会：

- 优先在原消息上添加 reaction 作为即时确认
- reaction 不可用时退化为发送一条简短确认消息
- 当任务运行时间较长时发送一次处理中提示
- 尽量复用处理中提示来回填最终结果，减少重复消息

## 回复协议与附件

如果 Codex 需要发送文件，会在最终回复末尾附加一个隐藏块：

```text
已完成，并附带了结果文件。

<FEISHU_ATTACHMENTS>
{"attachments":[{"path":"docs/plans/latest-plan.md"}]}
</FEISHU_ATTACHMENTS>
```

桥接会移除这段隐藏块、校验路径、上传文件，并把文件回传到飞书。

附件规则：

- 文件必须已经存在于 `CODEX_WORKSPACE_ROOT` 内
- 路径必须相对于工作区根目录
- 单次最多 3 个附件
- 单个文件超过 30 MB 会被拒绝

## 日志

- 终端日志保留时间戳格式
- 同样内容会写入 `~/.feishu-codex-bridge/logs/bridge-YYYY-MM-DD.log`
- 当 `CODEX_VERBOSE_EVENTS=true` 时，还会写入 `~/.feishu-codex-bridge/logs/requests/<requestId>.codex-events.jsonl`

## Verbose 事件模式

开启方式：

```env
CODEX_VERBOSE_EVENTS=true
CODEX_EXECUTION_TAIL_LINES=20
```

这个模式更适合排查真实请求流程，能把更多执行细节保存在本地，并把更多中间信息回传到飞书。

## 手动验证

建议在飞书私聊中做以下验证：

1. 发送 `ping`，确认桥接服务能正常回复。
2. 发送一个普通任务，再执行 `/reset`，确认会话重置后仍可继续处理。
3. 让 Codex 回传工作区中已有的 attachments 文件。
4. 使用非 allowlisted 账号发送消息，确认请求会被拒绝。
5. 发送一个故意耗时较长的任务，确认 timeout 场景表现符合预期。

## 常见问题

### 环境变量缺失

先检查：

- `.env` 是否存在
- `FEISHU_APP_ID`、`FEISHU_APP_SECRET`、`CODEX_WORKSPACE_ROOT`、`ALLOWED_OPEN_IDS` 是否为空

### 找不到 `codex` 命令

先执行：

```bash
codex --help
```

如果你使用自定义命令路径，请同步更新 `CODEX_COMMAND`。

### 全局安装后找不到 `feishu-codex-bridge` 命令

先执行：

```bash
npm bin -g
```

确认输出目录已经加入当前 shell 的 `PATH`，然后重新打开终端再试。

### 收不到消息或响应不正常

重点检查：

- 权限修改后是否已经重新发布应用版本
- 当前聊天是否为私聊
- 消息类型是否为文本
- 发送人是否在 `ALLOWED_OPEN_IDS` 中

### 附件发送失败

重点检查：

- 路径是否相对于工作区根目录
- 文件是否真实存在
- 文件是否小于 30 MB
- 文件是否位于 `CODEX_WORKSPACE_ROOT` 内

## 当前限制

- 仅支持飞书私聊文本消息
- 同一时间仅允许一个任务执行
- 仅支持单一固定工作区
- 附件发送仅支持工作区内已经存在的本地文件

## 安全建议

- 妥善保管 `.env`
- 仅把可信用户加入 `ALLOWED_OPEN_IDS`
- 默认优先使用 `workspace-write`，避免不必要的更高权限

## License

本项目采用 GNU GPL v3.0 only 许可证。Copyright (C) 2026 diffhuang。

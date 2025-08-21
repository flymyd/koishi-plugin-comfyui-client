import FormData from 'form-data';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

export class ComfyUINode {
  serverEndpoint: any;
  isSecureConnection: boolean;
  clientId: any;
  ws: any;
  ctx: any;
  constructor(ctx: any, serverEndpoint: any, isSecureConnection: boolean = false, clientId: any = null) {
    this.ctx = ctx;
    this.serverEndpoint = serverEndpoint;
    this.isSecureConnection = isSecureConnection;
    this.clientId = clientId || uuidv4();
    this.ws = null;
  }
  /**
   * 用户上传图片，返回服务器的响应值
   * @param {Buffer|ArrayBuffer} imageBuffer - 图片数据
   * @param {string} filename - 文件名
   * @param {boolean} overwrite - 是否覆盖已存在的文件，默认true
   * @returns {Promise<Object>} 服务器响应，包含success、data和message
   */
  async uploadImage(imageBuffer, filename, overwrite = true) {
    try {
      const formData = new FormData();
      formData.append('image', imageBuffer, filename);
      formData.append('overwrite', overwrite.toString());

      const response = await this.ctx.http.post(`${this.isSecureConnection ? 'https' : 'http'}://${this.serverEndpoint}/upload/image`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      return {
        success: true,
        data: response,
        message: 'Image uploaded successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        message: 'Failed to upload image'
      };
    }
  }

  /**
   * 建立WebSocket连接
   * @returns {Promise<void>}
   */
  async connect() {
    return new Promise<void>((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      const url = `${this.isSecureConnection ? 'wss' : 'ws'}://${this.serverEndpoint}/ws?clientId=${this.clientId}`;
      this.ws = new WebSocket(url, {
        perMessageDeflate: false,
      });

      this.ws.on('open', () => {
        resolve();
      });

      this.ws.on('close', () => {
        this.ws = null;
      });

      this.ws.on('error', (err) => {
        reject(err);
      });

      this.ws.on('message', (data, isBinary) => {
        if (!isBinary) {
          try {
            const message = JSON.parse(data.toString());
            this._handleWebSocketMessage(message);
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        }
      });
    });
  }

  /**
   * 处理WebSocket消息
   * @param {Object} message - WebSocket消息
   */
  _handleWebSocketMessage(message) {
    switch (message.type) {
      case 'status':
        break;
      case 'progress':
        if (message.data.max && message.data.value !== undefined) {
          const progress = ((message.data.value / message.data.max) * 100).toFixed(1);
          process.stdout.write(`\rProgress: ${progress}% `);
        }
        break;
      case 'executing':
        if (message.data.node) {
        }
        break;
      case 'execution_start':
        break;
      case 'executed':
        break;
      default:
        break;
    }
  }

  /**
   * 断开WebSocket连接
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * 提交prompt到队列
   * @param {Object} prompt - JSON格式的prompt
   * @returns {Promise<Object>} 队列响应
   */
  async queuePrompt(prompt) {
    try {
      const response = await this.ctx.http.post(`${this.isSecureConnection ? 'https' : 'http'}://${this.serverEndpoint}/prompt`, {
        prompt,
        client_id: this.clientId
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      return {
        success: true,
        data: response,
        prompt_id: response.prompt_id,
        number: response.number
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        message: 'Failed to queue prompt'
      };
    }
  }

  /**
   * 获取执行历史
   * @param {string} promptId - prompt ID
   * @returns {Promise<Object>} 历史记录
   */
  async getHistory(promptId) {
    try {
      const url = promptId ?
        `${this.isSecureConnection ? 'https' : 'http'}://${this.serverEndpoint}/history/${promptId}` :
        `${this.isSecureConnection ? 'https' : 'http'}://${this.serverEndpoint}/history`;

      const response = await this.ctx.http.get(url);

      return {
        success: true,
        data: promptId ? response[promptId] : response
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        message: 'Failed to get history'
      };
    }
  }

  /**
   * 获取生成的图片
   * @param {string} filename - 文件名
   * @param {string} subfolder - 子文件夹
   * @param {string} type - 类型
   * @returns {Promise<Buffer>} 图片数据
   */
  async getImage(filename, subfolder = '', type = 'output') {
    try {
      const url = `${this.isSecureConnection ? 'https' : 'http'}://${this.serverEndpoint}/view?filename=${filename}&subfolder=${subfolder}&type=${type}`;
      const response = await this.ctx.http.get(url, { responseType: 'arraybuffer' });

      return {
        success: true,
        data: response,
        buffer: Buffer.from(response)
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        message: 'Failed to get image'
      };
    }
  }

  /**
   * 等待prompt执行完成并获取结果
   * @param {string} promptId - prompt ID
   * @returns {Promise<Object>} 执行结果
   */
  async waitForCompletion(promptId) {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        this.ws?.off('message', onMessage);
        reject(new Error('Execution timeout'));
      }, 300000); // 5分钟超时

      const onMessage = async (data, isBinary) => {
        if (isBinary) return;

        try {
          const message = JSON.parse(data.toString());
          const messageData = message.data;

          // 检查是否是我们等待的prompt完成消息
          if (message.type === 'executing' &&
            messageData.prompt_id === promptId &&
            messageData.node === null) {

            clearTimeout(timeout);
            this.ws?.off('message', onMessage);

            // 获取执行历史和结果
            const historyResult = await this.getHistory(promptId);
            if (!historyResult.success) {
              reject(new Error('Failed to get execution history'));
              return;
            }

            const history = historyResult.data;
            const outputs = {};

            // 处理输出结果
            for (const nodeId of Object.keys(history.outputs || {})) {
              const nodeOutput = history.outputs[nodeId];
              if (nodeOutput.images) {
                const images = [];
                for (const imageInfo of nodeOutput.images) {
                  if (imageInfo.type === 'output') {
                    const imageResult = await this.getImage(
                      imageInfo.filename,
                      imageInfo.subfolder,
                      imageInfo.type
                    );

                    if (imageResult.success) {
                      images.push({
                        filename: imageInfo.filename,
                        subfolder: imageInfo.subfolder,
                        type: imageInfo.type,
                        buffer: imageResult.buffer,
                        data: imageResult.data
                      });
                    }
                  }
                }
                outputs[nodeId] = { images };
              }
            }

            resolve({
              success: true,
              prompt_id: promptId,
              outputs,
              history,
              message: 'Execution completed successfully'
            });
          }
        } catch (err) {
          clearTimeout(timeout);
          this.ws?.off('message', onMessage);
          reject(err);
        }
      };

      this.ws.on('message', onMessage);
    });
  }

  /**
   * 避免缓存：修改prompt中的随机参数
   * @param {Object} promptJson - 原始prompt
   * @param {boolean} avoidCache - 是否避免缓存，默认true
   * @returns {Object} 修改后的prompt
   */
  _modifyPromptToAvoidCache(promptJson, avoidCache = true) {
    if (!avoidCache) {
      return promptJson;
    }

    // 深拷贝prompt以避免修改原始对象
    const modifiedPrompt = JSON.parse(JSON.stringify(promptJson));

    // 生成随机seed
    const randomSeed = Math.floor(Math.random() * 1000000000000000);

    // 查找并修改所有包含seed的节点
    for (const nodeId in modifiedPrompt) {
      const node = modifiedPrompt[nodeId];
      if (node.inputs && typeof node.inputs.seed !== 'undefined') {
        node.inputs.seed = randomSeed;
      }

      // 对于一些特殊的随机参数也进行修改
      if (node.inputs && typeof node.inputs.noise_seed !== 'undefined') {
        node.inputs.noise_seed = randomSeed;
      }
    }

    return modifiedPrompt;
  }

  /**
   * 用户上传JSON格式的prompt文本，执行该prompt工作流
   * 执行后轮询，直到成功后返回服务器的响应值
   * @param {Object} workflowJson - JSON格式的prompt
   * @param {string} userPrompt - 用户输入的prompt
   * @param {Object} options - 执行选项
   * @param {boolean} options.avoidCache - 是否避免缓存，默认true
   * @returns {Promise<Object>} 执行结果
   */
  async executePromptWorkflow(workflowJson: any, userPrompt: string, options: any = {}) {
    const { avoidCache = true } = options;

    try {

      // 0. 修改prompt
      const newSeedPrompt = this._modifyPromptToAvoidCache(workflowJson, avoidCache);
      const finalPrompt = JSON.parse(JSON.stringify(newSeedPrompt).replace("114514.1919810", userPrompt))
      // 1. 建立WebSocket连接
      await this.connect();
      // 2. 提交prompt到队列
      const queueResult = await this.queuePrompt(finalPrompt);
      if (!queueResult.success) {
        await this.disconnect();
        return queueResult;
      }

      // 3. 等待执行完成
      const executionResult = await this.waitForCompletion(queueResult.prompt_id);

      // 4. 断开连接
      await this.disconnect();

      return executionResult;

    } catch (error) {
      // 确保断开连接
      await this.disconnect();

      return {
        success: false,
        error: error.message,
        message: 'Workflow execution failed'
      };
    }
  }

  /**
   * 中断当前执行
   * @returns {Promise<Object>} 中断结果
   */
  async interrupt() {
    try {
      const response = await this.ctx.http.post(`${this.isSecureConnection ? 'https' : 'http'}://${this.serverEndpoint}/interrupt`, null, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        data: response,
        message: 'Execution interrupted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        message: 'Failed to interrupt execution'
      };
    }
  }

  /**
   * 获取队列状态
   * @returns {Promise<Object>} 队列状态
   */
  async getQueueStatus() {
    try {
      const response = await this.ctx.http.get(`${this.isSecureConnection ? 'https' : 'http'}://${this.serverEndpoint}/queue`);

      return {
        success: true,
        data: response,
        message: 'Queue status retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        message: 'Failed to get queue status'
      };
    }
  }
}

export default ComfyUINode;
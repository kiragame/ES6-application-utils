import { upload, UploadResponse } from './http-req';

/**
 * vias-nginx-upload-module配套上传组件 d=====(￣▽￣*)b
 */
export interface UploadQueueData {
  id: string;
  sessionID: string;
  file: File;
  // 文件大小
  fileSize: number;
  // 文件名
  fileName: string;
  // 上传偏移量
  offset: number;
  // 文件状态
  status: number;
  // 文件上传进度
  progress: number;
  // 文件上传路径
  uploadUrl: string;
  // 存储路径
  storagePath: string;
}

interface UploadQueueDataRequest {
  id?: string;
  sessionID?: string;
  file?: File;
  // 文件大小
  fileSize?: number;
  // 文件名
  fileName?: string;
  // 上传偏移量
  offset?: number;
  // 文件状态
  status?: number;
  // 文件上传进度
  progress?: number;
  // 文件上传路径
  uploadUrl?: string;
  // 存储路径
  storagePath?: string;
}

interface RawFileData {
  id: string;
  fileId: string;
  file: File;
  uploadUrl: string;
  storagePath: string;
  fileName?: string;
}

interface UploadQueueProps {
  // 初始列表
  initList?: Array<RawFileData>;
  // 单次传输大小
  uploadSize: number;
  // 单次上传后回调, cb处进行下一次调用
  afterUpload?: (data: UploadQueueData, cb: any) => void;
  // 单次文件上传完成后回调
  onSuccess?: (data: UploadQueueData) => void;
  // 单次上传失败后回调
  onError?: (data: {} | UploadQueueData) => void;
}

class UploadQueue {
  // 外部更改参数
  isOFF: boolean = false;

  // 文件队列
  queue: UploadQueueData[] = [];

  // 正在上传的文件列表
  uploadingSessionIDs: Set<string> = new Set();

  // 1M
  uploadSize: number = 1048576;

  // 最大同时上传个数
  uploadLimit: number = 1;

  // 修改配置
  setting = (props: UploadQueueProps) => {
    const { initList, uploadSize, afterUpload, onSuccess, onError } = props;

    uploadSize && (this.uploadSize = uploadSize);
    initList && initList.forEach((item) => this.addFile(item));
    afterUpload && (this.afterUpload = afterUpload);
    onSuccess && (this.onSuccess = onSuccess);
    onError && (this.onError = onError);
  };

  // 向队列中添加文件
  addFile = (data: RawFileData): void => {
    console.log('addFile???');
    this.queue.push(this._convertRFD(data));
    this.startUpload();
  };

  // 获取Queue队列
  getQueueList = (): Array<UploadQueueData> => {
    return this.queue;
  };

  // 上传之后回调
  afterUpload = (data: UploadQueueData, cb: any): void => { };

  // 成功之后回调
  onSuccess = (data: UploadQueueData): void => { };

  // 错误之后回调
  onError = (data: UploadQueueData | {}): void => { };

  // 开启
  startUpload = (sessionID: string | '' = '') => {
    console.warn('【开启上传】：', sessionID, this.queue, this.uploadingSessionIDs);
    // if (this.uploadingSessionIDs.size >= this.uploadLimit) {
    //   console.error('LIMITED-超出同时上传的限制');
    //   return;
    // }
    if (sessionID !== '') {
      this.uploadingSessionIDs.add(sessionID);
      this._updateQueueData(sessionID, { status: FILE_STATUS_EN_TO_VAL.TRANSFERING });
      return;
    }

    // 自动开启
    if (this.queue.length !== 0) {
      const length = this.queue.length;
      // 列表中存在等待状态的文件
      for (let i = 0; i < length; i++) {
        const tmp = this.queue[i];
        if (tmp.status === FILE_STATUS_EN_TO_VAL.WAITING) {
          const tmpSessionID = tmp.sessionID;
          this.uploadingSessionIDs.add(tmpSessionID);
          this._updateQueueData(tmpSessionID, { status: FILE_STATUS_EN_TO_VAL.TRANSFERING });
          break;
        }
      }
    }
  };

  // 移除
  removeUpload = (sessionID: string) => {
    this._updateQueueData(sessionID, { status: FILE_STATUS_EN_TO_VAL.DELETED });
    this._removeQueueData(sessionID);
  };

  // 从[sessionID]列表中移除
  private _removeUploadingSessionIDs = (sessionID: string) => {
    this.uploadingSessionIDs.delete(sessionID);
  };

  // 上传
  private _startUploadReq = (sessionID: string): void => {
    if (this.isOFF) {
      return;
    }

    const data = this._getQueueData(sessionID);
    if (!this._canUpload(sessionID)) {
      return;
    }
    if (data === null) {
      return;
    }

    console.warn('【_startUploadReq】', sessionID);
    upload({ ...data, uploadSize: this.uploadSize }).then((res: UploadResponse) => {
      // datas deal
      let upgradeData = { ...data };
      if (res.status === 'success') {
        upgradeData = { ...upgradeData, ...res.data };
        if (res.data.progress === 100) {
          upgradeData.status = FILE_STATUS_EN_TO_VAL.FINISHED;
        } else {
          upgradeData.status = FILE_STATUS_EN_TO_VAL.TRANSFERING;
        }
      } else {
        // 更新错误状态
        switch (res.error_code) {
          case '':
            upgradeData.status = FILE_STATUS_EN_TO_VAL.PAUSED;
            break;
          case '0309020550':
            upgradeData.status = FILE_STATUS_EN_TO_VAL.DELETED;
            break;
          case '-2':
            upgradeData.status = FILE_STATUS_EN_TO_VAL.DELETED;
            break;
          default:
            upgradeData.status = FILE_STATUS_EN_TO_VAL.ABNORMAL;
        }
      }

      // 更新上传列表数据、调用用户自定义回调函数
      this._updateQueueData(sessionID, upgradeData);
    });
  };

  // 停止上传，修改列表中对象状态
  private _stopUploadReq = (sessionID: string): void => {
    this.queue = this.queue.map((item) => {
      if (item.sessionID === sessionID) {
        item.status = FILE_STATUS_EN_TO_VAL.PAUSED;
      }
      return item;
    });
  };

  // 获取队列中单个数据
  private _getQueueData = (sessionID: string): UploadQueueData | null => {
    const length = this.queue.length;
    for (let i = 0; i < length; i++) {
      if (this.queue[i].sessionID === sessionID) {
        return this.queue[i];
      }
    }
    return null;
  };

  // 更新队列数据
  private _updateQueueData = (sessionID: string, data: UploadQueueDataRequest): void => {
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].sessionID !== sessionID) {
        continue;
      }

      const newQueData: UploadQueueData = { ...this.queue[i], ...data };
      this.queue[i] = newQueData;

      switch (newQueData.status) {
        case FILE_STATUS_EN_TO_VAL.DELETED:
          this._removeQueueData(sessionID);
          this.onError(newQueData);
          console.warn('【上传文件】: onError', sessionID, data);
          break;
        case FILE_STATUS_EN_TO_VAL.FINISHED:
          this._removeQueueData(sessionID);
          this.onSuccess(newQueData);
          console.warn('【上传文件】: onSuccess', sessionID, data);
          break;
        case FILE_STATUS_EN_TO_VAL.ABNORMAL:
          this._removeQueueData(sessionID);
          this.onError(newQueData);
          console.warn('【上传文件】: onError', sessionID, data);
          break;
        default:
          if (this.isOFF) {
            this._removeQueueData(sessionID);
            this.onError(newQueData);
            console.warn('【上传文件】: onError', sessionID, data);
          } else {
            this.afterUpload(newQueData, () => this._startUploadReq(sessionID));
            console.warn('【上传文件】: afterUpload', sessionID, data);
          }
      }
    }
  };

  // 从上传队列中移除数据
  private _removeQueueData = (sessionID: string): void => {
    this._stopUploadReq(sessionID);
    this._removeUploadingSessionIDs(sessionID);

    // 移除数据
    let i = this.queue.length - 1;
    for (i; i >= 0; i--) {
      if (this.queue[i].sessionID === sessionID) {
        this.queue.splice(i, 1);
      }
    }

    // 自动开启
    this.startUpload();
  };

  // 文件可上传验证
  private _canUpload = (sessionID: string): boolean => {
    const data = this._getQueueData(sessionID);
    // 上传内容不在队列中
    if (data === null) {
      this._removeQueueData(sessionID);
      return false;
    }

    // 上传队列中不存在
    if (!this.uploadingSessionIDs.has(sessionID)) {
      return false;
    }

    // 文件异常
    if (!data.file || data.fileSize === 0 || data.fileName === '') {
      this._removeQueueData(sessionID);
      return false;
    }

    // 文件上传地址不存在
    if (!data.uploadUrl) {
      this._removeQueueData(sessionID);
      return false;
    }

    // 上传文件状态非传输态
    if (data.status !== FILE_STATUS_EN_TO_VAL.TRANSFERING) {
      return false;
    }

    return true;
  };

  private _convertRFD = (data: RawFileData): UploadQueueData => {
    const { file, id, fileId, uploadUrl, storagePath, fileName } = data;

    return {
      offset: 0,
      progress: 0,
      status: FILE_STATUS_EN_TO_VAL.WAITING,
      fileSize: file.size,
      fileName: fileName || file.name,
      sessionID: fileId,
      id,
      file,
      uploadUrl,
      storagePath,
    };
  };

  private _convertRFDList = (datas: RawFileData[]): UploadQueueData[] => {
    return datas.map((data) => this._convertRFD(data));
  };
}

export const FILE_STATUS_VAL_TO_CN = {
  '-1': '文件被人删除',
  '0': '等待上传中',
  '1': '暂停',
  '2': '文件传输中',
  '3': '完成',
  '4': '异常',
};
export const FILE_STATUS_EN_TO_VAL = {
  DELETED: -1,
  WAITING: 0,
  PAUSED: 1,
  TRANSFERING: 2,
  FINISHED: 3,
  ABNORMAL: 4,
};

export default UploadQueue;

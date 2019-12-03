import axios from 'axios';

const axiosInstance = axios.create();

const request = axiosInstance.post;

export interface UploadResponse {
  status: 'error' | 'success';
  // 后端错误码
  error_code: string;
  // 错误信息
  message: string;
  data: {
    progress: number;
    offset: number;
    sessionID: string;
  };
}

interface UploadProps {
  sessionID: string;
  file: File;
  // 文件大小
  fileSize: number;
  // 文件名
  fileName: string;
  // 上传偏移量
  offset: number;
  // 文件上传路径
  uploadUrl: string;
  // 存储路径
  storagePath?: string;
  // 文件上传大小
  uploadSize: number;
}

interface UploadRequestData {
  sessionID: string;
  file: File;
  // 文件大小
  fileSize: number;
  // 文件名
  fileName: string;
  // 文件上传路径
  uploadUrl: string;
  // 存储路径
  storagePath?: string;

  // 分片起
  start: number;
  // 分片止
  end: number;
  // 文件片段
  byteFile: string | ArrayBuffer | null;
  // 上传完成回调
  resolve: (data: UploadResponse) => void;
}

export async function upload(params: UploadProps) {
  return new Promise((resolve: (v: UploadResponse) => void) => {
    const { file, sessionID, offset, fileSize, uploadSize, uploadUrl, storagePath } = params;

    const blobSlice =
      // File.prototype.mozSlice ||
      // File.prototype.webkitSlice ||
      File.prototype.slice;
    let byteFile;
    const reqSize = uploadSize && uploadSize >= 0 ? uploadSize : 0;
    const totalSize = file.size || 0;
    const fileName = file.name || 'error-input.info';
    const start = offset >= totalSize ? totalSize - 1 : offset;
    const end = offset + reqSize > totalSize ? totalSize : offset + reqSize;

    // js中的blob没有没有直接读出其数据的方法，通过FileReader来读取相关数据
    const reader = new FileReader();
    reader.readAsArrayBuffer(blobSlice.call(file, start, end));

    //  当读取操作成功完成时调用.
    reader.onload = () => {
      byteFile = reader.result;

      fileUploadRequest({
        file,
        uploadUrl,
        byteFile,
        start,
        end,
        fileSize,
        fileName,
        sessionID,
        resolve,
        storagePath,
      });
    };
  }).then((res) => res);
}

function fileUploadRequest(params: UploadRequestData) {
  const {
    uploadUrl,
    byteFile,
    start,
    end,
    fileSize,
    fileName,
    sessionID,
    resolve,
    storagePath,
  } = params;

  const feedback: UploadResponse = {
    status: 'error',
    error_code: '',
    message: 'error',
    data: {
      progress: 0,
      offset: 0,
      sessionID: sessionID || 'error-input',
    },
  };

  const reqParams = {
    params: byteFile,
    headers: {
      ...(getFileUploadHeader(
        feedback.data.sessionID,
        start,
        end - 1,
        fileSize,
        fileName,
        storagePath,
      ) || {}),
    },
  };

  console.warn('【上传请求开始】', reqParams.headers);
  request(uploadUrl, reqParams.params, { headers: reqParams.headers }).then((axiosRes) => {
    console.warn('【上传请求完成】:', axiosRes, axiosRes.data);

    // 清空存储
    delete reqParams.params;

    const res = axiosRes.data;

    if (axiosRes.status === 200) {
      feedback.status = 'success';
      feedback.data.offset = fileSize - 1;
      feedback.data.progress = 100;
    } else if (axiosRes.status === 201) {
      let resDeal = res || '0-0/0';
      // eslint-disable-next-line
      resDeal = resDeal.split('/')[0].split('-');

      if (parseInt(resDeal[0], 10) === 0) {
        feedback.status = 'success';
        feedback.data.offset = parseInt(resDeal[1], 10) + 1;
        feedback.data.progress = Math.floor((feedback.data.offset / fileSize) * 100);
      } else {
        // 特殊处理
        feedback.status = 'error';
        feedback.error_code = '-2';
        feedback.message = '文件被其他人删除';

        console.error('【上传错误】:文件被其他人删除', reqParams.headers.sessionID);
      }
    } else if (res) {
      const { error_code: code, message } = res;
      feedback.error_code = code;
      feedback.message = message;

      console.error('【上传错误】:', reqParams.headers.sessionID, code, message);
    }

    resolve(feedback);
  }).catch(() => {
    resolve(feedback);
  });
}

function getFileUploadHeader(
  sessionID: string,
  start: number,
  end: number,
  total: number,
  fileName: string,
  storagePath: string | null = null,
) {
  const retVal: any = {
    Accept: '*/*',
    'Session-ID': sessionID,
    'X-Content-Range': `bytes ${start}-${end}/${total}`,
    'Content-Disposition': `attachment;filename=${encodeURIComponent(fileName)}`,
    'Content-Length': end - start,
    'Content-Type': 'application/octet-stream',
  };

  if (storagePath !== null) {
    retVal['Storage-Info'] = storagePath;
  }

  return retVal;
}

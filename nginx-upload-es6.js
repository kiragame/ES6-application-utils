// nginx-upload-module 扩展包的上传demo- JAVASCRIPT实现（ES6)
// 坑：1. 请求时传输数据类型为Bytes
//     2. FileReader onload异步执行
//     3. Session-ID不能为中文

export async function upload(params) {
  const { data, id, offSet, reqSize: reqS } = params;
  // 函数返回值
  const feedback = {
	// 上传是否成功
    message: "error",
	// 百分比; 下一次上传开始位置; session_id。当percent === 100时文件已全部传输
    data: {
      percent: 0,
      offSet: 0,
      session_id: id || "error-input",
    },
  };

  const url = "your request url";

  const ret = new Promise(resolve => {
    // js中的blob没有没有直接读出其数据的方法，通过FileReader来读取相关数据
    const reader = new FileReader();
    reader.readAsArrayBuffer(data);

    //  当读取操作成功完成时调用.
    reader.onload = () => {
      const reqSize = reqS && reqS >= 0 ? reqS : 0;
      const totalSize = reader.result.byteLength;
      const fileName = data.name || "error-input.info";
      const start = offSet >= totalSize ? totalSize - 1 : offSet;
      const end = offSet + reqSize > totalSize ? totalSize : offSet + reqSize;

	  // 替换为自己的请求方法
      return request(url, {
        method: "POST",
		// 切分文件[start, end)
        body: reader.result.slice(start, end),
        headers: {
          ...(getFileUploadHeader(
            feedback.data.session_id,
            start,
			// 实际传输为[start, end-1]
            end - 1,
            totalSize,
            fileName
          ) || {}),
        },
      }).then(res => {
        if (res.status === 200) {
          feedback.message = "success";
          feedback.data.offSet = totalSize - 1;
          feedback.data.percent = 100;
        } else if (res.status === 201) {
          let resDeal = res.text || "0-0/0";
          resDeal = resDeal.split("/")[0].split("-")[1];

          feedback.message = "success";
          feedback.data.offSet = parseInt(resDeal) + 1;
          feedback.data.percent = Math.floor((end / totalSize) * 100);
        }
        resolve(feedback);
      });
    };
  });

  return feedback;
}

function getFileUploadHeader(sessionId, start, end, total, fileName) {
  return {
    "Session-ID": sessionId,
    "X-Content-Range": `bytes ${start}-${end}/${total}`,
    "Content-Disposition": `attachment;filename=${fileName}`,
    "Content-Length": end - start,
    "Content-Type": "application/octet-stream",
  };
}

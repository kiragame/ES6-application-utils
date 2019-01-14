// nginx-upload-module ��չ�����ϴ�demo- JAVASCRIPTʵ�֣�ES6)
// �ӣ�1. ����ʱ������������ΪBytes
//     2. FileReader onload�첽ִ��
//     3. Session-ID����Ϊ����

export async function upload(params) {
  const { data, id, offSet, reqSize: reqS } = params;
  // ��������ֵ
  const feedback = {
	// �ϴ��Ƿ�ɹ�
    message: "error",
	// �ٷֱ�; ��һ���ϴ���ʼλ��; session_id����percent === 100ʱ�ļ���ȫ������
    data: {
      percent: 0,
      offSet: 0,
      session_id: id || "error-input",
    },
  };

  const url = "your request url";

  const ret = new Promise(resolve => {
    // js�е�blobû��û��ֱ�Ӷ��������ݵķ�����ͨ��FileReader����ȡ�������
    const reader = new FileReader();
    reader.readAsArrayBuffer(data);

    //  ����ȡ�����ɹ����ʱ����.
    reader.onload = () => {
      const reqSize = reqS && reqS >= 0 ? reqS : 0;
      const totalSize = reader.result.byteLength;
      const fileName = data.name || "error-input.info";
      const start = offSet >= totalSize ? totalSize - 1 : offSet;
      const end = offSet + reqSize > totalSize ? totalSize : offSet + reqSize;

	  // �滻Ϊ�Լ������󷽷�
      return request(url, {
        method: "POST",
		// �з��ļ�[start, end)
        body: reader.result.slice(start, end),
        headers: {
          ...(getFileUploadHeader(
            feedback.data.session_id,
            start,
			// ʵ�ʴ���Ϊ[start, end-1]
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

  if (ret) {
    return ret.then(res => {
      return res;
    });
  } else {
    return feedback;
  }
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
## Usage
```code
import UploadQueue from './index';
const UploadList = new UploadQueue();

UploadList.setting({
  uploadSize: 10485760,
  afterUpload: (data, callback) => {
    // your code
  },
  onError: (data) => {
    // your code
  },
  onSuccess: (data) => {
    // your code
  },
});
```

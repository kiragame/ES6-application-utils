
/**
 * 索引双向链表
 */
export default class LinkedList {
  
  // 指向前一节点的属性
  __prePointer = 'linked-pre';
  // 指向后一节点的属性
  __afterPointer = 'linked-after';
  // 链表长度
  __length = 0;

  // 第一个节点
  __firstNode = null;
  // 中间节点
  __middleNode = null;
  // 最后一个节点
  __lastNode = null;

  /**
   * 链表添加节点,返回处理后的新值
   * @param data 数据
   */
  add = (data) => {

    if (!data) {
      console.error('【LinkedList】添加节点失败：', data);
      return null;
    }

    const fData = { ...data };

    // 链表数据初始
    if (this.__firstNode === null) {
      this.__firstNode = fData;
      this.__lastNode = fData;
      this.__middleNode = fData;
      this.__length ++;
      return fData;
    }

    this.__lastNode[this.__afterPointer] = fData;
    fData[this.__prePointer] = this.__lastNode;
    this.__lastNode = fData;

    // 当前长度修改
    this.__length ++;

    // 修改__middleNode
    // 长度为奇数，middle向后挪一位
    if (this.__length % 2 === 1) {
      this.__middleNode = this.__middleNode[this.__afterPointer];
    }

    return fData;
  }

  /**
   * 链表某位置向后插入,返回处理后的新值
   * @param index 位置 [-1, this.__length); -1为头部插入
   * @param data 数据
   */
  insert = (index, data) => {

    if (!data) {
      console.error('【LinkedList】添加节点失败：', data);
      return null;
    }

    if (!Number.isInteger(index)) {
      console.error('【LinkedList】remove(i: number)入参错误！！！');
      return null;
    }

    if (index >= this.__length || index < -1) {
      return null;
    }

    const fData = { ...data };

    if (index === -1) {
      fData[this.__prePointer] = null;
      fData[this.__afterPointer] = this.__firstNode;
      this.__firstNode = fData;
    } else {
      const getedData = this.get(index);
      fData[this.__afterPointer] = getedData[this.__afterPointer];
      getedData[this.__afterPointer][this.__prePointer] = fData;
      getedData[this.__afterPointer] = fData;
      fData[this.__prePointer] = getedData;
    }

    this.__length ++;
    return fData;
  }

  /**
   * 获取链表中元素，下标从0开始，可用值修改链表
   * @param index 索引
   */
  get = (index) => {
    if (!Number.isInteger(index)) {
      console.error('【LinkedList】remove(i: number)入参错误！！！');
      return null;
    }

    if (index >= this.__length || index < 0) {
      return null;
    }
    
    // 中间位置index
    const middleIndex = Math.floor(this.__length / 2);
    // 四分之一长
    const quarter = this.__length / 4;
    // index与中间位子的差值
    const mAiGap = Math.abs(middleIndex - index);
    // 后半区寻找
    if (index >= middleIndex) {
      // 从中间往后找
      if (mAiGap <= quarter) {
        let tmp = this.__middleNode;
        for (let i = middleIndex; i <= index; i ++) {
          if (i === index) {
            return tmp;
          }
          tmp = tmp[this.__afterPointer];
        }
      // 从后往中间找
      } else {
        let tmp = this.__lastNode;
        for (let i = this.__length - 1; i >= index; i --) {
          if (i === index) {
            return tmp;
          }
          tmp = tmp[this.__prePointer];
        }
      }
    } else {
      // 从中间往前找
      if (mAiGap <= quarter) {
        let tmp = this.__middleNode;
        for (let i = middleIndex; i >= index; i --) {
          if (i === index) {
            return tmp;
          }
          tmp = tmp[this.__prePointer];
        }
      // 从前往中间找
      } else {
        let tmp = this.__firstNode;
        for (let i = 0; i <= index; i ++) {
          if (i === index) {
            return tmp;
          }
          tmp = tmp[this.__afterPointer];
        }
      }
    }

    return null;
  }

  /**
   * 获取数组形式的全链表
   * 【大数据量慎用】
   */
  getList = () => {
    const retV = new Set();
    let tmp = this.__firstNode;
    for (let i = 0; i < this.__length; i ++) {
      const rTmp = { ...tmp };
      delete rTmp[this.__prePointer];
      delete rTmp[this.__afterPointer];
      retV.add(rTmp);
      tmp = tmp[this.__afterPointer];
    }
    return Array.from(retV);
  }

  /**
   * 获取区间列表 [from, end]
   * @param from 起点index
   * @param end 终点index
   */
  getScopeList = (from, end) => {

    if (from > end) {
      console.error('【LinkedList】参数范围错误from:', from ,',to:', end);
      return [];
    }

    let fromNode = this.get(from);
    if (!fromNode) {
      return [];
    }

    const scopeSet = new Set();
    for (let i = from; i <= end; i ++) {
      const tN = { ...fromNode };
      delete tN[this.__prePointer];
      delete tN[this.__afterPointer];
      scopeSet.add(tN);

      fromNode = fromNode[this.__afterPointer];
      if (!fromNode) {
        break;
      }
    }

    return Array.from(scopeSet);
  }

  /**
   * 删除节点、返回删除节点的值，下标从0开始，该值无法操作链表
   * @param index 索引
   */
  remove = (index) => {
    const getedData = this.get(index);

    if (getedData === null) {
      return getedData;
    }

    // 长度缩减
    this.__length--;

    // 移除最后一个元素
    if (this.__length === index) {
      this.__lastNode = this.__lastNode[this.__prePointer];
      if (this.__lastNode) {
        this.__lastNode[this.__afterPointer] = null;
      }
    }

    // 移除第一个元素
    if (index === 0) {
      this.__firstNode = this.__firstNode[this.__afterPointer];
      if (this.__firstNode) {
        this.__firstNode[this.__prePointer] = null;
      }
    }

    // 移除中间元素
    if (index > 0 && index < this.__length - 1) {
      const preNode = getedData[this.__prePointer];
      const afterNode = getedData[this.__afterPointer];

      if (afterNode) {
        afterNode[this.__prePointer] = preNode;
      }
      if (preNode) {
        preNode[this.__afterPointer] = afterNode;
      }
    }

    // middle移位
    if (this.__length % 2 === 1) {
      if (index >= this.__length / 2) {
        this.__middleNode = this.__middleNode? this.__middleNode[this.__prePointer]: null;
      } else {
        this.__middleNode = this.__middleNode? this.__middleNode[this.__afterPointer]: null;
      }
    }

    delete getedData[this.__prePointer];
    delete getedData[this.__afterPointer];
    return getedData;
  }

  /**
   * 获取链表大小
   */
  size = () => {
    return this.__length;
  }

}

if (!Number.isInteger) {
  Number.prototype.isInteger = function (global) {
    var floor = Math.floor,
        isFinite = global.isFinite;
  
    Object.defineProperty(Number, 'isInteger', {
        value: function isInteger(value) {
            return typeof value === 'number' &&
                isFinite(value) &&
                floor(value) === value;
        },
        configurable: true,
        enumerable: false,
        writable: true
    });
  };
}
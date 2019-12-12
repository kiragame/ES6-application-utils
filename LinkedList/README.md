#双向链表
## API
add(node) => null | node
insert(index, node) => null | node
get(index) => null | node
getList() => node[]
getScopeList(fromIndex, endIndex) => node[]
remove(index) => node
size() => number
## 使用方法
``code
import LinkedList from './LinkedList';

const list = new LinkedList();

for (let i = 0; i < 10; i ++) {
  list.add({ id: i });
}

console.log(list.getList());
list.remove(7);
console.log(list.getList());

``

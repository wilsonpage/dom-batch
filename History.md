
0.8.0 / 2013-10-14
==================

  * change to a rAF loop technique of emtying frame queue to prevent frame conflicts
  * add ability to call `FastDom#defer` with no frame argument to schedule job for next free frame

0.7.1 / 2013-10-05
==================

  * fix memory leaks with undeleted refs
  * fix context not being passed to `.defer` jobs

0.7.0 / 2013-10-05
==================

  * add `FastDom#clear` clears read, write and defer jobs by id
  * remove `FastDom#clearRead`
  * remove `FastDom#clearWrite`
  * change directory structure by removing `/lib`


/**
 * DOM-Batch
 *
 * Eliminates layout thrashing
 * by batching DOM read/write
 * interactions.
 *
 * @author Wilson Page <wilsonpage@me.com>
 */

;(function(dom){

  'use strict';

  // RequestAnimationFrame Polyfill
  var raf = window.requestAnimationFrame
    || window.webkitRequestAnimationFrame
    || window.mozRequestAnimationFrame
    || function(cb) { window.setTimeout(cb, 1000 / 60); };

  // Use existing instance if
  // one already exists in
  // this app, else make one.
  dom = (dom instanceof DomBatch)
    ? dom
    : new DomBatch();

  /**
   * Creates a fresh
   * DomBatch instance.
   *
   * @constructor
   */
  function DomBatch() {
    this.reads = [];
    this.writes = [];
    this.mode = null;
    this.pending = false;
  }

  /**
   * Adds a job to
   * the read queue.
   *
   * @param  {Function} fn
   * @api public
   */
  DomBatch.prototype.read = function(fn) {
    this.reads.push(fn);
    this.request('read');
  };

  /**
   * Adds a job to
   * the write queue.
   *
   * @param  {Function} fn
   * @api public
   */
  DomBatch.prototype.write = function(fn) {
    this.writes.push(fn);
    this.request('write');
  };

  /**
   * Removes a job from
   * the 'reads' queue.
   *
   * @param  {Function} fn
   * @api public
   */
  DomBatch.prototype.clearRead = function(fn) {
    remove(this.reads, fn);
  };

  /**
   * Removes a job from
   * the 'writes' queue.
   *
   * @param  {Function} fn
   * @api public
   */
  DomBatch.prototype.clearWrite = function(fn) {
    remove(this.writes, fn);
  };

  /**
   * Makes the decision as to
   * whether a the frame needs
   * to be scheduled.
   *
   * @param  {String} type
   * @api private
   */
  DomBatch.prototype.request = function(type) {
    var self = this;

    // If we are currently writing, we don't
    // need to scedule a new frame as this
    // job will be emptied from the write queue
    if (this.mode === 'writing' && type === 'write') return;

    // If we are reading we don't need to schedule
    // a new frame as this read will be emptied
    // in the currently active read queue
    if (this.mode === 'reading' && type === 'read') return;

    // If we are reading we don't need to schedule
    // a new frame and this write job will be run
    // after the read queue has been emptied in the
    // currently active frame.
    if (this.mode === 'reading' && type === 'write') return;

    // If there is already a frame
    // scheduled, don't schedule another one
    if (this.pending) return;

    // Schedule frame (preserving context)
    raf(function() { self.frame(); });

    // Set flag to indicate
    // a frame has been scheduled
    this.pending = true;
  };

  /**
   * Calls each job in
   * the list passed.
   *
   * @param  {Array} list
   * @api private
   */
  DomBatch.prototype.run = function(list) {
    while (list.length) {
      list.shift().call(this);
    }
  };

  /**
   * Runs any read jobs followed
   * by any write jobs.
   *
   * @api private
   */
  DomBatch.prototype.frame = function() {

    // Set the pending flag to
    // false so that any new requests
    // that come in will schedule a new frame
    this.pending = false;

    // Set the mode to 'reading',
    // then empty all read jobs
    this.mode = 'reading';
    this.run(this.reads);

    // Set the mode to 'writing'
    // then empty all write jobs
    this.mode = 'writing';
    this.run(this.writes);

    this.mode = null;
  };

  /**
   * Util
   */

  function remove(array, item) {
    var index = array.indexOf(item);
    if (~index) array.splice(index, 1);
  }

  /**
   * Expose 'DomBatch'
   */

  if (typeof exports === "object") {
    module.exports = dom;
  } else if (typeof define === "function" && define.amd) {
    define(function(){ return dom; });
  } else {
    window['dom'] = dom;
  }

})(window.dom);
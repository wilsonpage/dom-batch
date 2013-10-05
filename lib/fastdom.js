
/**
 * DOM-Batch
 *
 * Eliminates layout thrashing
 * by batching DOM read/write
 * interactions.
 *
 * @author Wilson Page <wilsonpage@me.com>
 */

;(function(fastdom){

  'use strict';

  // Normalize rAF
  var raf = window.requestAnimationFrame
    || window.webkitRequestAnimationFrame
    || window.mozRequestAnimationFrame
    || function(cb) { window.setTimeout(cb, 1000 / 60); };

  // Normalize cAF
  var caf = window.cancelAnimationFrame
    || window.cancelRequestAnimationFrame
    || window.mozCancelAnimationFrame
    || window.mozCancelRequestAnimationFrame
    || window.webkitCancelAnimationFrame
    || window.webkitCancelRequestAnimationFrame
    || window.msCancelAnimationFrame
    || window.msCancelRequestAnimationFrame
    || function(id) { window.clearTimeout(id); };

  // Use existing instance if
  // one already exists in
  // this app, else make one.
  fastdom = (fastdom instanceof FastDom)
    ? fastdom
    : new FastDom();

  /**
   * Creates a fresh
   * FastDom instance.
   *
   * @constructor
   */
  function FastDom() {
    this.lastId = 0;
    this.jobs = {};
    this.mode = null;
    this.pending = false;
    this.queue = {
      read: [],
      write: []
    };
  }

  /**
   * Adds a job to
   * the read queue.
   *
   * @param  {Function} fn
   * @api public
   */
  FastDom.prototype.read = function(fn, ctx) {
    var job = this._add('read', fn, ctx);
    this.queue.read.push(job.id);
    this._request('read');
    return job.id;
  };

  /**
   * Adds a job to
   * the write queue.
   *
   * @param  {Function} fn
   * @api public
   */
  FastDom.prototype.write = function(fn, ctx) {
    var job = this._add('write', fn, ctx);
    this.queue.write.push(job.id);
    this._request('write');
    return job.id;
  };

  /**
   * Removes a job from
   * the 'reads' queue.
   *
   * @param  {Number} id
   * @api public
   */
  FastDom.prototype.clear = function(id) {
    var job = this.jobs[id];
    if (!job) return;

    // Defer jobs are cleared differently
    if (job.type === 'defer') {
      caf(job.timer);
      return;
    }

    var list = this.queue[job.type];
    var index = list.indexOf(id);

    if (~index) list.splice(index, 1);
    delete this.jobs[id];
  };

  /**
   * Makes the decision as to
   * whether a the frame needs
   * to be scheduled.
   *
   * @param  {String} type
   * @api private
   */
  FastDom.prototype._request = function(type) {
    var mode = this.mode;
    var self = this;

    // If we are currently writing, we don't
    // need to scedule a new frame as this
    // job will be emptied from the write queue
    if (mode === 'writing' && type === 'write') return;

    // If we are reading we don't need to schedule
    // a new frame as this read will be emptied
    // in the currently active read queue
    if (mode === 'reading' && type === 'read') return;

    // If we are reading we don't need to schedule
    // a new frame and this write job will be run
    // after the read queue has been emptied in the
    // currently active frame.
    if (mode === 'reading' && type === 'write') return;

    // If there is already a frame
    // scheduled, don't schedule another one
    if (this.pending) return;

    // Schedule frame (preserving context)
    raf(function() { self._frame(); });

    // Set flag to indicate
    // a frame has been scheduled
    this.pending = true;
  };

  /**
   * Generates a unique
   * id for a job.
   *
   * @return {Number}
   */
  FastDom.prototype._uniqueId = function() {
    return ++this.lastId;
  };

  /**
   * Calls each job in
   * the list passed.
   *
   * If a context has been
   * stored on the function
   * then it is used, else the
   * current `this` is used.
   *
   * @param  {Array} list
   * @api private
   */
  FastDom.prototype._run = function(list) {
    var ctx;
    var job;
    var id;

    while (id = list.shift()) {
      job = this.jobs[id];
      ctx = job.ctx || this;
      delete this.jobs[id];
      try { job.fn.call(ctx); } catch (e) {
        if (this.onError) this.onError(e);
      }
    }
  };

  /**
   * Runs any read jobs followed
   * by any write jobs.
   *
   * @api private
   */
  FastDom.prototype._frame = function() {

    // Set the pending flag to
    // false so that any new requests
    // that come in will schedule a new frame
    this.pending = false;

    // Set the mode to 'reading',
    // then empty all read jobs
    this.mode = 'reading';
    this._run(this.queue.read);

    // Set the mode to 'writing'
    // then empty all write jobs
    this.mode = 'writing';
    this._run(this.queue.write);

    this.mode = null;
  };

  /**
   * Defers the given job
   * by the number of frames
   * specified.
   *
   * @param  {Number}   frames
   * @param  {Function} fn
   * @api public
   */
  FastDom.prototype.defer = function(frames, fn, ctx) {
    if (frames < 0) return;
    var job = this._add('defer', fn);
    (function wrapped() {
      if (frames-- === 0) {
        try { fn.call(ctx); } catch(e) {
          if (this.onError) this.onError(e);
        }
      } else {
        job.timer = raf(wrapped);
      }
    })();
    return job.id;
  };

  /**
   * Adds a new job to
   * the given queue.
   *
   * @param {Array}   list
   * @param {Function} fn
   * @param {Object}   ctx
   * @returns {Number} id
   * @api private
   */
  FastDom.prototype._add = function(type, fn, ctx) {
    var id = this._uniqueId();
    return this.jobs[id] = {
      id: id,
      fn: fn,
      ctx: ctx,
      type: type
    };
  };

  /**
   * Removes a job from
   * the given queue.
   * @param  {Array} list
   * @param  {Number} id
   * @api private
   */
  FastDom.prototype._remove = function(list, id) {
    var index = list.indexOf(id);
    if (~index) list.splice(index, 1);
    delete this.jobs[id];
  };

  /**
   * Expose 'FastDom'
   */

  if (typeof exports === "object") {
    module.exports = fastdom;
  } else if (typeof define === "function" && define.amd) {
    define(function(){ return fastdom; });
  } else {
    window['fastdom'] = fastdom;
  }

})(window.fastdom);

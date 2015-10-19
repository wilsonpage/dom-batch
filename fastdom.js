(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

/**
 * FastDom
 *
 * Eliminates layout thrashing
 * by batching DOM read/write
 * interactions.
 *
 * @author Wilson Page <wilsonpage@me.com>
 * @author Kornel Lesinski <kornel.lesinski@ft.com>
 */

'use strict';
/**
 * Mini logger
 *
 * @return {Function}
 */

var debug = 0 ? console.log.bind(console, '[fastdom]') : function() {};

/**
 * Normalize rAF
 *
 * @type {Function}
 */

var raf = window.requestAnimationFrame
  || window.webkitRequestAnimationFrame
  || window.mozRequestAnimationFrame
  || window.msRequestAnimationFrame
  || function(cb) { return setTimeout(cb, 16); };

/**
 * Initialize a `FastDom`.
 *
 * @constructor
 */

function FastDom() {
  this.reads = [];
  this.writes = [];

  // Placing the rAF method
  // on the instance allows
  // us to replace it with
  // a stub for testing.
  this.raf = raf.bind(window);
  this._flush = this._flush.bind(this);
  this._flushReads = this._flushReads.bind(this);
  debug('initialized', this);
}

/**
 * Overide with your own function if you
 * want to catch exceptions thrown in tasks.
 */

FastDom.prototype.catch = undefined;

/**
 * Adds a job to the read batch and
 * schedules a new frame if need be.
 *
 * @param  {Function} fn
 * @param  {Object} [ctx]
 * @public
 */

FastDom.prototype.measure = FastDom.prototype.read = function(fn, ctx) {
  debug('measure');
  var task = { fn: fn, ctx: ctx };
  this.reads.push(task);
  scheduleReadFlush(this);
  return task;
};

/**
 * Adds a job to the
 * write batch and schedules
 * a new frame if need be.
 *
 * @param  {Function} fn
 * @param  {Object} [ctx]
 * @public
 */

FastDom.prototype.mutate = FastDom.prototype.write = function(fn, ctx) {
  debug('mutate');
  var task = { fn: fn, ctx: ctx };
  this.writes.push(task);
  scheduleFlush(this);
  return task;
};

/**
 * Clears a scheduled 'read' or 'write' task.
 *
 * @param {Object} id
 * @public
 */

FastDom.prototype.clear = function(task) {
  debug('clear', task);
  var i; if (~(i = this.reads.indexOf(task))) this.reads.splice(i, 1);
  else if (~(i = this.writes.indexOf(task))) this.writes.splice(i, 1);
};

/**
 * Schedules a new read/write
 * batch if one isn't pending.
 *
 * @private
 */

function scheduleFlush(fastdom) {
  if (fastdom.scheduled) return;
  fastdom.scheduled = true;
  fastdom.raf(fastdom._flush);
  debug('flush scheduled');
}

/**
 * Schedules a new read
 * batch if one isn't pending.
 *
 * @private
 */

function scheduleReadFlush(fastdom) {
  if (fastdom.scheduledRead) return;
  fastdom.scheduledRead = true;

  //setTimeout can be called later than a rAF (especially when called inside a event handler).
  //by additionally using the ordinary scheduleFlush function we make sure that reads are called as early as possible.
  setTimeout(fastdom._flushReads, 0);
  scheduleFlush(fastdom);

  debug('flushReads scheduled');
}

/**
 * Runs queued tasks.
 *
 * Errors are caught and thrown by default.
 * If a .catch function has been defined
 * it is called instead.
 *
 * @param taskList {Array}
 *
 * @private
 */

FastDom.prototype._flushList = function(taskList) {
  debug('flushList');
  var error;

  try {
    runTasks(taskList);
  } catch (e) { error = e; }

  this.scheduled = false;
  this.scheduledRead = false;

  // If the batch errored we may still have tasks queued
  if (taskList.length) this._flushList(taskList);

  if (error) {
    if (this.catch) this.catch(error);
    else throw error;
  }
};

/**
 * Runs queued `read` and `write` tasks..
 *
 * @private
 */

FastDom.prototype._flush = function() {
  debug('flush');

  this._flushReads();
  this._flushList(this.writes);

  this.scheduled = false;
};

/**
 * Runs queued `read` tasks..
 *
 * @private
 */

FastDom.prototype._flushReads = function() {
  debug('flushReads');

  this._flushList(this.reads);

  this.scheduledRead = false;
};

/**
 * We run this inside a try catch
 * so that if any jobs error, we
 * are able to recover and continue
 * to flush the batch until it's empty.
 *
 * @private
 */

function runTasks(tasks) {
  debug('run tasks');
  var task; while (task = tasks.shift()) task.fn.call(task.ctx);
}

/**
 * Create a new `Sandbox`.
 *
 * Scheduling tasks via a sandbox is
 * useful because you can clear all
 * sandboxed tasks in one go.
 *
 * This is useful when working with view
 * components. You can create one sandbox
 * per component and call `.clear()` when
 * tearing down.
 *
 * Example:
 *
 *   var sandbox = fastdom.sandbox();
 *
 *   sandbox.measure(function() { console.log(1); });
 *   sandbox.measure(function() { console.log(2); });
 *
 *   fastdom.measure(function() { console.log(3); });
 *   fastdom.measure(function() { console.log(4); });
 *
 *   sandbox.clear();
 *
 *   // => 3
 *   // => 4
 *
 * @return {Sandbox}
 * @public
 */

FastDom.prototype.sandbox = function() {
  return new Sandbox(this);
};

/**
 * Initialize a new `Sandbox`
 *
 * @param {FastDom} fastdom
 */

function Sandbox(fastdom) {
  this.fastdom = fastdom;
  this.reads = [];
  this.writes = [];
  debug('sandbox initialized');
}

/**
 * Schedule a 'measure' task.
 *
 * @param  {Function} fn
 * @param  {Object}   ctx
 * @return {Object} can be passed to .clear()
 */

Sandbox.prototype.measure = Sandbox.prototype.read = function(fn, ctx) {
  var reads = this.reads;
  var task = this.fastdom.measure(function() {
    reads.splice(reads.indexOf(task));
    fn.call(ctx);
  });

  reads.push(task);
  return task;
};

/**
 * Schedule a 'mutate' task.
 *
 * @param  {Function} fn
 * @param  {Object}   ctx
 * @return {Object} can be passed to .clear()
 */

Sandbox.prototype.mutate = Sandbox.prototype.write = function(fn, ctx) {
  var writes = this.writes;
  var task = this.fastdom.mutate(function() {
    writes.splice(writes.indexOf(task));
    fn.call(ctx);
  });

  this.writes.push(task);
  return task;
};

/**
 * Clear a single task or is no task is
 * passsed, all tasks in the `Sandbox`.
 *
 * @param  {Object} task (optional)
 */

Sandbox.prototype.clear = function(task) {
  if (task) return this.fastdom.clear(task);
  clearAll(this.fastdom, this.writes);
  clearAll(this.fastdom, this.reads);
};

/**
 * Clears all the given tasks from
 * the given `FastDom`.
 *
 * @param  {FastDom} fastdom
 * @param  {Array} tasks
 * @private
 */

function clearAll(fastdom, tasks) {
  debug('clear all', fastdom, tasks);
  for (var i = 0, l = tasks.length; i < l; i++) {
    fastdom.clear(tasks[i]);
    tasks.splice(i, 1);
  }
}

/**
 * Place on window to guarantee singleton.
 *
 * We only ever want there to be one
 * instance of `FastDom` in an app.
 */

// jscs:disable requireDotNotation
module.exports = window['fastdom'] = (window['fastdom'] || new FastDom());

},{}]},{},[1]);

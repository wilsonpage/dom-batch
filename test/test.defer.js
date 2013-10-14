
suite('defer', function(){

  test('Should run the job after the specified number of frames', function(done) {
    var fastdom = new FastDom();
    var job = sinon.spy();

    fastdom.defer(3, job);

    raf(function() {
      assert(!job.called);
      raf(function() {
        assert(!job.called);
        raf(function() {
          assert(job.called);
          done();
        });
      });
    });
  });

  test('Should call a deferred callback with the given context', function(done) {
    var fastdom = new FastDom();
    var cb = sinon.spy();
    var ctx = { foo: 'bar' };

    fastdom.defer(2, function() {
      assert.equal(this.foo, 'bar');
      done();
    }, ctx);
  });

  test('Should run work at next frame if frames argument not supplied.', function(done) {
    var fastdom = new FastDom();
    var callback1 = sinon.spy();
    var callback2 = sinon.spy();

    fastdom.defer(callback1);

    raf(function() {
      assert(callback1.called);
      done();
    });
  });

  test('Should run each job on a different frame.', function(done) {
    var fastdom = new FastDom();
    var callback1 = sinon.spy();
    var callback2 = sinon.spy();
    var callback3 = sinon.spy();

    fastdom.defer(callback1);
    fastdom.defer(callback2);
    fastdom.defer(callback3);

    raf(function() {
      assert(callback1.called);
      assert(!callback2.called);
      assert(!callback3.called);
      raf(function() {
        assert(callback2.called);
        assert(!callback3.called);
        raf(function() {
          assert(callback3.called);
          done();
        });
      });
    });
  });

  test('Should run fill empty frames before later work is run.', function(done) {
    var fastdom = new FastDom();
    var callback1 = sinon.spy();
    var callback2 = sinon.spy();
    var callback3 = sinon.spy();
    var callback4 = sinon.spy();

    // Frame 3
    fastdom.defer(3, callback3);

    // Frame 1
    fastdom.defer(callback1);

    // Frame 2
    fastdom.defer(callback2);

    // Frame 4
    fastdom.defer(callback4);

    raf(function() {
      assert(callback1.called);
      assert(!callback2.called);
      assert(!callback3.called);
      assert(!callback4.called);
      raf(function() {
        assert(callback2.called);
        assert(!callback3.called);
        assert(!callback4.called);
        raf(function() {
          assert(callback3.called);
          assert(!callback4.called);
          raf(function() {
            assert(callback4.called);
            done();
          });
        });
      });
    });
  });
});

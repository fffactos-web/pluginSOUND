import test from 'node:test';
import assert from 'node:assert/strict';
import {gainFor,nextOutput} from '../audio-model.js';
test('volume remains safe, supports mute and unity gain',()=>{assert.equal(gainFor(0),0);assert.equal(gainFor(50),.5);assert.equal(gainFor(100),1);assert.equal(gainFor(-20),0);assert.equal(gainFor(250),1);assert.throws(()=>gainFor(NaN));});
test('switching twice restores original output',()=>{assert.equal(nextOutput(0),1);assert.equal(nextOutput(1),0);assert.equal(nextOutput(nextOutput(0)),0);});

import assert from "node:assert/strict";
import test from "node:test";
import { distanceRuntime } from "./distance-runtime.mjs";

function touch(slider, type, x, y = 10, identifier = 1, remaining = []) {
  const finger = {identifier, clientX:x, clientY:y};
  slider.dispatchEvent({type, touches:(type === "touchstart" || type === "touchmove") ? [finger] : remaining, changedTouches:[finger]});
}

function input(slider, value) {
  slider.value = String(value);
  slider.dispatchEvent({type:"input"});
}

test("one-finger drag keeps raw values until release and snaps nearby single-trip targets", () => {
  for (const market of ["de", "eu", "tr", "us"]) {
    const rt = distanceRuntime(market);
    for (const id of ["kmEv", "kmVb"]) {
      const slider = rt.elements.get(id);
      slider.getBoundingClientRect = () => ({width:318});
      const targets = market === "us" ? [30, 60, 120, 150, 180, 240, 300] : [50, 100, 200, 250, 300, 400, 500];
      for (const target of targets) {
        for (const raw of [target - 1, Math.min(target + 1, Number(slider.max))]) {
          touch(slider, "touchstart", 0);
          input(slider, raw);
          assert.equal(Number(slider.value), raw);
          touch(slider, "touchmove", 25);
          touch(slider, "touchend", 30);
          assert.equal(Number(slider.value), target);
          assert.equal(slider.getAttribute("aria-valuetext"), rt.elements.get(id + "V").textContent);
          assert.equal(JSON.parse(rt.storage.get("eaf.inputs.v2"))[id], String(target));
        }
      }
    }
  }
});

test("comparison snaps near 100, 500 and 1,000 across all markets but leaves distant values intact", () => {
  for (const market of ["de", "eu", "tr", "us"]) {
    const rt = distanceRuntime(market);
    const slider = rt.elements.get("kmShared");
    slider.getBoundingClientRect = () => ({width:318});
    for (const [raw, expected] of [[89,100], [121,100], [512,500], [980,1000], [246,246]]) {
      touch(slider, "touchstart", 0);
      input(slider, raw);
      touch(slider, "touchend", 30);
      assert.equal(Number(slider.value), expected);
      assert.equal(rt.run("Math.round(_kmToDist(_getCompareData().kmEv))"), expected);
    }
  }
});

test("touch tap, vertical movement, cancellation, second finger, key and accessibility-style input stay precise", () => {
  const rt = distanceRuntime("de");
  const slider = rt.elements.get("kmEv");
  slider.getBoundingClientRect = () => ({width:318});
  for (const [endX, endY, interrupt] of [
    [2,10], [15,36], [30,10,"touchcancel"], [30,10,"keydown"], [30,10,"second"]
  ]) {
    touch(slider, "touchstart", 0);
    input(slider, 99);
    if (interrupt === "second") slider.dispatchEvent({type:"touchstart", touches:[{}, {}], changedTouches:[{}]});
    else if (interrupt) slider.dispatchEvent({type:interrupt, key:"ArrowLeft"});
    touch(slider, "touchend", endX, endY);
    assert.equal(Number(slider.value), 99);
  }
  input(slider, 101);
  slider.dispatchEvent({type:"change"});
  slider.dispatchEvent({type:"pointerup", pointerType:"mouse"});
  assert.equal(Number(slider.value), 101);
});

test("exact editing still accepts neighbors and distances outside the single-trip slider", () => {
  const rt = distanceRuntime("de");
  for (const id of ["kmEv","kmVb","kmShared"]) {
    for (const value of [99,100,101,249,399,400,401,500,501]) {
      rt.elements.get(id + "V").click();
      rt.elements.get(id + "Edit").value = String(value);
      rt.elements.get(id + "Done").click();
      assert.equal(rt.run(`n('${id}')`), value);
    }
  }
});

test("single-trip release helps near 100 and 400, while values beyond the window and taps survive", () => {
  for (const market of ["de", "eu", "tr", "us"]) {
    const rt = distanceRuntime(market);
    const slider = rt.elements.get("kmEv");
    slider.getBoundingClientRect = () => ({width:330});
    const us = market === "us";
    for (const target of us ? [60,240] : [100,400]) {
      for (const direction of [-1,1]) {
        const near = target + direction * (us ? 7 : 12);
        const outside = target + direction * (us ? 9 : 14);
        for (const [raw, dx, expected] of [
          [near,4,target], [near,5,target], [near,30,target], [outside,30,outside]
        ]) {
          touch(slider, "touchstart", 50);
          input(slider, raw);
          assert.equal(Number(slider.value), raw);
          touch(slider, "touchmove", 50 + direction * dx);
          touch(slider, "touchend", 50 + direction * dx);
          assert.equal(Number(slider.value), expected);
        }
      }
    }
  }
});

test("short WebKit drag reaches the anchor only after a matching move and a value change", () => {
  const rt = distanceRuntime("de");
  const slider = rt.elements.get("kmVb");
  slider.getBoundingClientRect = () => ({width:330});
  for (const [target, raw] of [[100,101], [200,201], [300,301], [400,401]]) {
    for (const [moves, changes, expected] of [[false,true,raw],[true,false,raw],[true,true,target]]) {
      input(slider, changes ? raw - 1 : raw);
      touch(slider, "touchstart", 100);
      if (moves) touch(slider, "touchmove", 101.25);
      if (changes) input(slider, raw);
      assert.equal(Number(slider.value), raw);
      touch(slider, "touchend", 101.25);
      assert.equal(Number(slider.value), expected);
      assert.equal(slider.getAttribute("aria-valuetext"), expected + " km");
    }
  }
});

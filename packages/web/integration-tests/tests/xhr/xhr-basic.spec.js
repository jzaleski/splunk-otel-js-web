/*
Copyright 2020 Splunk Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

const { isBrowser } = require('../../utils/helpers');

module.exports = {
  '@tags': ['safari-10.1'],
  beforeEach: function (browser) {
    browser.globals.clearReceivedSpans();
  },
  'XHR request is registered': async function(browser) {
    await browser.url(browser.globals.getUrl('/xhr/views/xhr-basic.ejs'));
    const xhrSpan = await browser.globals.findSpan(span => span.tags['http.url'] === browser.globals.getUrl('/some-data', []));
    await browser.assert.ok(xhrSpan, 'got an xhr span');
    await browser.assert.strictEqual(xhrSpan.tags['component'], 'xml-http-request');
    await browser.assert.strictEqual(xhrSpan.tags['http.status_code'], '200');
    await browser.assert.strictEqual(xhrSpan.tags['http.status_text'], 'OK');
    await browser.assert.strictEqual(xhrSpan.tags['http.method'], 'GET');
    await browser.assert.strictEqual(xhrSpan.tags['http.url'], browser.globals.getUrl('/some-data', []));
    if (!isBrowser(browser, { safari: true, ie: true })) {
      await browser.assert.strictEqual(xhrSpan.tags['http.response_content_length'], '49');
    }
    await browser.assert.ok(xhrSpan.tags['link.traceId'], 'got link.traceId');
    await browser.assert.ok(xhrSpan.tags['link.spanId'], 'got link.spanId');
    
    if (!isBrowser(browser, {
      safari: { max: 10 },
      ie: true,
    })) {
      await browser.timesMakeSense(xhrSpan.annotations, 'domainLookupStart', 'domainLookupEnd');
      await browser.timesMakeSense(xhrSpan.annotations, 'connectStart', 'connectEnd');
      await browser.timesMakeSense(xhrSpan.annotations, 'secureConnectionStart', 'connectEnd');
      await browser.timesMakeSense(xhrSpan.annotations, 'requestStart', 'responseStart');
      await browser.timesMakeSense(xhrSpan.annotations, 'responseStart', 'responseEnd');
      await browser.timesMakeSense(xhrSpan.annotations, 'fetchStart', 'responseEnd');
    }

    await browser.timesMakeSense(xhrSpan.annotations, 'open', 'send');
    await browser.timesMakeSense(xhrSpan.annotations, 'send', 'loaded');
    await browser.globals.assertNoErrorSpans();
  },
  'module can be disabled': async function(browser) {
    await browser.url(browser.globals.getUrl('/xhr/views/xhr-basic.ejs'));
    await browser.globals.waitForTestToFinish();

    const awaitedUrl = browser.globals.getUrl('/some-data', []);
    browser.assert.ok(!!browser.globals.getReceivedSpans().find(span => span.tags['http.url'] === awaitedUrl), 'Checking presence of xhr span.');

    browser.globals.clearReceivedSpans();
    await browser.url(browser.globals.getUrl('/xhr/views/xhr-basic.ejs?disableInstrumentation=xhr'));
    await browser.globals.waitForTestToFinish();

    browser.assert.not.ok(browser.globals.getReceivedSpans().find(span => span.tags['http.url'] === awaitedUrl), 'Checking lack of xhr span.');
  }
};

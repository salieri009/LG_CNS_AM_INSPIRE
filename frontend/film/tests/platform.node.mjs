import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromeExecutable, gpuArgs, filmPath } from '../platform.mjs';

test('Windows system and user installations are found without assuming the drive', () => {
  const env = { PROGRAMFILES:'D:\\Programs', 'PROGRAMFILES(X86)':'D:\\Programs (x86)', LOCALAPPDATA:'C:\\Users\\정비사\\AppData\\Local' };
  for (const path of [
    'D:\\Programs\\Google\\Chrome\\Application\\chrome.exe',
    'D:\\Programs (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Users\\정비사\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
  ]) assert.equal(chromeExecutable({platform:'win32',env,fileExists:f=>f===path}),path);
});

test('an explicit path with spaces takes priority over autodetection', () => {
  const custom = 'E:\\Chrome Test\\chrome.exe';
  assert.equal(chromeExecutable({platform:'win32',env:{FILM_CHROME_PATH:custom},fileExists:f=>f===custom}),custom);
  assert.throws(()=>chromeExecutable({env:{FILM_CHROME_PATH:custom},fileExists:()=>false}),/FILM_CHROME_PATH/);
});

test('missing Chrome produces a useful configuration error', () => {
  assert.throws(()=>chromeExecutable({platform:'win32',env:{},fileExists:()=>false}),/FILM_CHROME_PATH/);
});

test('macOS and Linux defaults still work', () => {
  for (const [platform,path] of [
    ['darwin','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
    ['linux','/usr/bin/google-chrome'],
  ]) assert.equal(chromeExecutable({platform,env:{},fileExists:f=>f===path}),path);
});

test('Metal is restricted to macOS', () => {
  assert.ok(gpuArgs('darwin').includes('--use-angle=metal'));
  for (const platform of ['win32','linux']) assert.ok(!gpuArgs(platform).includes('--use-angle=metal'));
});

test('explicit paths are checked against the filesystem', () => {
  const dir = mkdtempSync(join(tmpdir(),'cardoc-film-'));
  const file = join(dir,'Chrome 테스트.exe');
  writeFileSync(file,'fixture');
  assert.equal(chromeExecutable({env:{FILM_CHROME_PATH:file}}),file);
  assert.throws(()=>chromeExecutable({env:{FILM_CHROME_PATH:dir}}),/FILM_CHROME_PATH/);
});

test('every output directory decodes spaces, percent signs and Korean with a native path', () => {
  const root = join(mkdtempSync(join(tmpdir(),'cardoc-path-')),'카닥 100% demo','film');
  const base = pathToFileURL(join(root,'script.mjs'));
  for (const dir of ['out/', 'out/v2/', 'out/probe/']) {
    const actual = filmPath('./'+dir,base);
    mkdirSync(actual,{recursive:true});
    writeFileSync(actual+'test.txt','saved');
    const expectedFile = join(root,...dir.split('/').filter(Boolean),'test.txt');
    assert.equal(readFileSync(expectedFile,'utf8'),'saved');
  }
});

#!/usr/bin/env node
/**
 * DBGODVS CLI 入口
 * 直接通过 Node.js 运行，不依赖 Electron
 */

const path = require('path')
const cliPath = path.join(__dirname, '..', 'electron', 'cli-standalone.js')
require(cliPath)

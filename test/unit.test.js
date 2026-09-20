const assert = require('assert');
const path = require('path');
const systemService = require('../src/main/systemService');
const terminalService = require('../src/main/terminalService');

async function runUnitTests() {
  console.log('🧪 Starting Unit Tests for Services...\n');

  // Test 1: systemService.getSystemMetrics()
  console.log('Test 1: systemService.getSystemMetrics()');
  const metrics = systemService.getSystemMetrics();
  assert(metrics !== null, 'Metrics should not be null');
  assert(typeof metrics.cpu.usagePercent === 'number', 'CPU usage should be a number');
  assert(metrics.memory.totalBytes > 0, 'Total memory should be > 0');
  assert(metrics.memory.freeBytes > 0, 'Free memory should be > 0');
  assert(metrics.memory.usedBytes > 0, 'Used memory should be > 0');
  assert(metrics.os.platform, 'OS platform should be defined');
  assert(Array.isArray(metrics.network), 'Network interfaces should be an array');
  console.log('  ✓ System metrics returns valid CPU, memory, OS, and network data');

  // Test 2: systemService.getSystemInfo()
  console.log('\nTest 2: systemService.getSystemInfo()');
  const info = systemService.getSystemInfo();
  assert(info.userInfo.username, 'Username should be defined');
  assert(info.userInfo.homedir, 'Homedir should be defined');
  assert(info.nodeVersion, 'Node version should be defined');
  console.log(`  ✓ System info returns user: ${info.userInfo.username}, platform: ${info.os.platform}`);

  // Test 3: systemService.getRunningProcesses()
  console.log('\nTest 3: systemService.getRunningProcesses()');
  const procs = await systemService.getRunningProcesses(10);
  assert(Array.isArray(procs), 'Processes should be an array');
  assert(procs.length > 0, 'Should find at least 1 running process');
  assert(procs[0].pid !== undefined, 'Process should have a pid');
  assert(procs[0].name, 'Process should have a name');
  console.log(`  ✓ Successfully fetched ${procs.length} processes (Top: ${procs[0].name}, PID: ${procs[0].pid})`);

  // Test 4: systemService.readDirectory()
  console.log('\nTest 4: systemService.readDirectory()');
  const dir = await systemService.readDirectory(path.join(__dirname, '..'));
  assert(dir.success === true, 'Directory read should succeed');
  assert(dir.items.length > 0, 'Should contain items in project root');
  const hasPackageJson = dir.items.some(i => i.name === 'package.json' && i.isFile);
  assert(hasPackageJson, 'Should find package.json in project root');
  console.log(`  ✓ Successfully read directory: found ${dir.items.length} items including package.json`);

  // Test 5: systemService.readFileContent()
  console.log('\nTest 5: systemService.readFileContent()');
  const file = await systemService.readFileContent(path.join(__dirname, '../package.json'));
  assert(file.success === true, 'File read should succeed');
  assert(file.isBinary === false, 'package.json should not be binary');
  assert(file.content.includes('terminal-project'), 'Content should contain project name');
  console.log(`  ✓ Successfully read package.json (${file.formattedSize})`);

  // Test 6: terminalService.setCwd()
  console.log('\nTest 6: terminalService cwd tracking');
  const initialCwd = terminalService.getDefaultCwd();
  assert(initialCwd, 'Default cwd should be defined');
  const changeRes = terminalService.setCwd('..');
  assert(changeRes.success, 'cd .. should succeed');
  assert(terminalService.getDefaultCwd() !== initialCwd, 'Cwd should have changed');
  terminalService.setCwd(initialCwd); // restore
  console.log('  ✓ CWD tracking and resolution works as expected');

  // Test 7: terminalService.executeCommand() streaming
  console.log('\nTest 7: terminalService.executeCommand() streaming');
  const mockWebContents = {
    isDestroyed: () => false,
    messages: [],
    send(channel, payload) {
      this.messages.push({ channel, payload });
    },
  };

  const execRes = terminalService.executeCommand({
    id: 'test-exec-1',
    command: 'echo "TEST_STREAM_SUCCESS"',
    webContents: mockWebContents,
  });

  assert(execRes.id === 'test-exec-1', 'Should return execution ID');

  // Wait for command completion
  await new Promise(resolve => setTimeout(resolve, 800));

  const streamMsg = mockWebContents.messages.find(m => m.channel === 'terminal:stream:test-exec-1');
  const exitMsg = mockWebContents.messages.find(m => m.channel === 'terminal:exit:test-exec-1');

  assert(streamMsg, 'Should receive stream output message');
  assert(streamMsg.payload.data.includes('TEST_STREAM_SUCCESS'), 'Stream output should contain echo text');
  assert(exitMsg, 'Should receive exit message');
  assert(exitMsg.payload.code === 0, 'Exit code should be 0');
  console.log('  ✓ Command execution streams stdout and sends exit code 0');

  console.log('\n🎉 ALL UNIT & SERVICE TESTS PASSED SUCCESSFULLY!\n');
}

runUnitTests().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});

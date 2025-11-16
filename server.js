const net = require('net');
const fs = require('fs');
const path = require('path');

// 設定
const PORT = process.env.PORT || 70;
const HOST = process.env.HOST || 'localhost';
const GOPHER_ROOT = path.join(__dirname, 'gopherdata');

// Gopherアイテムタイプ
const ITEM_TYPES = {
  FILE: '0',           // テキストファイル
  DIRECTORY: '1',      // ディレクトリ
  CSO_SEARCH: '2',     // CSO検索
  ERROR: '3',          // エラー
  BINHEX: '4',         // BinHex形式ファイル
  DOS_ARCHIVE: '5',    // DOSアーカイブ
  UUENCODED: '6',      // uuencodedファイル
  INDEX_SEARCH: '7',   // 検索サーバー
  TELNET: '8',         // Telnet
  BINARY: '9',         // バイナリファイル
  GIF: 'g',            // GIF画像
  IMAGE: 'I',          // 画像ファイル
  INFO: 'i',           // 情報行
  HTML: 'h',           // HTMLファイル
};

// Gopherメニュー項目を作成
function createMenuItem(type, displayName, selector, host = HOST, port = PORT) {
  return `${type}${displayName}\t${selector}\t${host}\t${port}\r\n`;
}

// ディレクトリのGopherメニューを生成
function generateDirectoryListing(dirPath, requestPath) {
  let menu = '';

  // ヘッダー情報
  menu += createMenuItem(ITEM_TYPES.INFO, 'Welcome to Gopher Server!', 'null', 'null', '0');
  menu += createMenuItem(ITEM_TYPES.INFO, '─────────────────────────', 'null', 'null', '0');
  menu += createMenuItem(ITEM_TYPES.INFO, '', 'null', 'null', '0');

  try {
    const files = fs.readdirSync(dirPath);

    // 親ディレクトリへのリンク（ルート以外）
    if (requestPath !== '' && requestPath !== '/') {
      const parentPath = path.dirname(requestPath);
      menu += createMenuItem(ITEM_TYPES.DIRECTORY, '.. (Parent Directory)', parentPath === '.' ? '' : parentPath);
    }

    // ディレクトリを先に表示
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      const itemPath = path.posix.join(requestPath, file);

      if (stats.isDirectory()) {
        menu += createMenuItem(ITEM_TYPES.DIRECTORY, `[DIR] ${file}`, itemPath);
      }
    });

    // ファイルを表示
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      const itemPath = path.posix.join(requestPath, file);

      if (stats.isFile()) {
        const ext = path.extname(file).toLowerCase();
        let itemType = ITEM_TYPES.FILE;

        // ファイルタイプの判定
        if (['.gif'].includes(ext)) {
          itemType = ITEM_TYPES.GIF;
        } else if (['.jpg', '.jpeg', '.png', '.bmp'].includes(ext)) {
          itemType = ITEM_TYPES.IMAGE;
        } else if (['.html', '.htm'].includes(ext)) {
          itemType = ITEM_TYPES.HTML;
        } else if (['.zip', '.tar', '.gz', '.bz2'].includes(ext)) {
          itemType = ITEM_TYPES.DOS_ARCHIVE;
        } else if (['.bin', '.exe', '.dat'].includes(ext)) {
          itemType = ITEM_TYPES.BINARY;
        }

        menu += createMenuItem(itemType, file, itemPath);
      }
    });

  } catch (error) {
    menu += createMenuItem(ITEM_TYPES.ERROR, `Error reading directory: ${error.message}`, 'error');
  }

  menu += createMenuItem(ITEM_TYPES.INFO, '', 'null', 'null', '0');
  menu += createMenuItem(ITEM_TYPES.INFO, '─────────────────────────', 'null', 'null', '0');
  menu += '.\r\n';  // Gopherメニューの終了マーク

  return menu;
}

// ファイルを送信
function sendFile(socket, filePath) {
  const stream = fs.createReadStream(filePath);

  stream.on('error', (error) => {
    const errorMenu = createMenuItem(ITEM_TYPES.ERROR, `Error reading file: ${error.message}`, 'error');
    socket.write(errorMenu + '.\r\n');
    socket.end();
  });

  stream.pipe(socket);

  stream.on('end', () => {
    socket.end();
  });
}

// クライアント接続を処理
function handleConnection(socket) {
  const clientAddr = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`[${new Date().toISOString()}] Connection from ${clientAddr}`);

  let request = '';

  socket.on('data', (data) => {
    request += data.toString();

    // Gopherリクエストは\r\nまたは\nで終わる
    if (request.includes('\r\n') || request.includes('\n')) {
      // リクエストのパースとトリム
      const selector = request.split(/\r?\n/)[0].trim();

      console.log(`[${new Date().toISOString()}] Request: "${selector}" from ${clientAddr}`);

      // セレクタが空の場合はルートディレクトリ
      const requestPath = selector === '' ? '' : selector;

      // セキュリティ: パストラバーサル攻撃を防ぐ
      const safePath = path.normalize(requestPath).replace(/^(\.\.[\/\\])+/, '');
      const fullPath = path.join(GOPHER_ROOT, safePath);

      // パスがGOPHER_ROOT外を指していないか確認
      if (!fullPath.startsWith(GOPHER_ROOT)) {
        const errorMenu = createMenuItem(ITEM_TYPES.ERROR, 'Access denied', 'error');
        socket.write(errorMenu + '.\r\n');
        socket.end();
        return;
      }

      // ファイルまたはディレクトリの存在確認
      fs.stat(fullPath, (err, stats) => {
        if (err) {
          // ファイルが見つからない
          const errorMenu = createMenuItem(ITEM_TYPES.ERROR, `File not found: ${selector}`, 'error');
          socket.write(errorMenu + '.\r\n');
          socket.end();
          console.log(`[${new Date().toISOString()}] 404: ${selector}`);
          return;
        }

        if (stats.isDirectory()) {
          // ディレクトリリスティングを送信
          const menu = generateDirectoryListing(fullPath, safePath);
          socket.write(menu);
          socket.end();
          console.log(`[${new Date().toISOString()}] Sent directory listing: ${selector}`);
        } else if (stats.isFile()) {
          // ファイルを送信
          sendFile(socket, fullPath);
          console.log(`[${new Date().toISOString()}] Sent file: ${selector}`);
        } else {
          // その他（シンボリックリンクなど）
          const errorMenu = createMenuItem(ITEM_TYPES.ERROR, 'Invalid resource type', 'error');
          socket.write(errorMenu + '.\r\n');
          socket.end();
        }
      });
    }
  });

  socket.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] Socket error from ${clientAddr}:`, error.message);
  });

  socket.on('end', () => {
    console.log(`[${new Date().toISOString()}] Connection closed: ${clientAddr}`);
  });
}

// サーバーの起動
function startServer() {
  // gopherdata ディレクトリが存在しない場合は作成
  if (!fs.existsSync(GOPHER_ROOT)) {
    fs.mkdirSync(GOPHER_ROOT, { recursive: true });
    console.log(`Created gopher root directory: ${GOPHER_ROOT}`);
  }

  const server = net.createServer(handleConnection);

  server.on('error', (error) => {
    console.error('Server error:', error);
    process.exit(1);
  });

  server.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`Gopher Server is running`);
    console.log(`Host: ${HOST}`);
    console.log(`Port: ${PORT}`);
    console.log(`Root: ${GOPHER_ROOT}`);
    console.log('='.repeat(50));
    console.log(`Connect with: gopher://${HOST}:${PORT}`);
    console.log('Or use telnet: telnet localhost', PORT);
    console.log('='.repeat(50));
  });
}

// サーバー起動
startServer();

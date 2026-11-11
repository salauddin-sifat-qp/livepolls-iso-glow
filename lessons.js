/* lessons.js: all content for the LivePoll explainer (lessons, scenes, steps, messages, payloads).
   Event names, paths and DTO fields were read from the repo; see each lesson's concept.repo for the source files.
   Tokens {r}, {R}, {redis} are replaced with the selected region in the regions lesson. */
(() => {
  'use strict';

  const regions = {
    us: { name: 'US', redis: 'HEROKU_REDIS_WHITE_TLS_URL' },
    eu: { name: 'EU', redis: 'HEROKU_REDIS_GREEN_TLS_URL' },
    ca: { name: 'CA', redis: 'HEROKU_REDIS_MAUVE_TLS_URL' },
    au: { name: 'AU', redis: 'HEROKU_REDIS_NAVY_TLS_URL' },
    ae: { name: 'AE', redis: 'HEROKU_REDIS_GOLD_TLS_URL' },
  };

  const lunch = ['Pizza', 'Tacos', 'Sushi', 'Salad'];
  const adapterNote = 'Internal to the socket.io Redis adapter. It is not part of the public API.';

  /* ---------- 1 · edge ---------- */
  const edge = {
    id: 'edge',
    title: 'Edge and apps',
    subtitle: 'Three hostnames, one API',
    concept: {
      title: 'Edge and apps',
      subtitle: 'Three browser apps share one API server.',
      paragraph:
        'You never talk to the NestJS server directly. In development, nginx listens on three hostnames: dev.livepoll.com serves the edit app, dev.livepoll.io serves the take app, and reports.dev.livepoll.com serves the reports app. Each hostname sends paths that start with /api/ to the same server. Every other path goes to that hostname’s Vite app. Only the edit hostname also forwards /ws/ with the Upgrade headers.',
      repo: [
        'livepoll-docker-dev/nginx-dev.conf',
        'client/apps/take-app/src/App.tsx',
        'client/apps/reports-app/src/app.tsx',
        'mcp-server/src/index.ts',
      ],
    },
    scene: {
      zones: [
        { id: 'browsers', label: 'Browsers', sub: 'your machine', kind: 'local', x: 16, y: 20, w: 272, h: 500 },
        { id: 'remote', label: 'LivePoll server', sub: 'NestJS :3109', kind: 'remote', x: 552, y: 60, w: 232, h: 420 },
      ],
      objects: [
        { id: 'host', type: 'laptop', at: [152, 156], scale: 0.75, name: 'Host', sub: 'edit-app' },
        { id: 'phone', type: 'phone', at: [152, 318], scale: 0.92, name: 'Audience', sub: 'take-app' },
        { id: 'report', type: 'reportSheet', at: [152, 454], scale: 0.8, name: 'Reports', sub: 'reports-app' },
        { id: 'nginx', type: 'router', at: [400, 285], scale: 1.1, name: 'nginx', sub: 'reverse proxy' },
        { id: 'api', type: 'serverStack', at: [668, 290], scale: 1.3, name: 'API server', sub: 'NestJS' },
      ],
      conns: [
        { id: 'host-nginx', from: 'host', to: 'nginx', label: 'HTTPS' },
        { id: 'phone-nginx', from: 'phone', to: 'nginx', label: 'HTTPS' },
        { id: 'report-nginx', from: 'report', to: 'nginx', label: 'HTTPS' },
        { id: 'nginx-api', from: 'nginx', to: 'api', label: '/api  /ws' },
      ],
    },
    steps: [
      {
        title: 'The host opens the edit app',
        text: 'You browse to dev.livepoll.com. nginx hands the page to the edit app. Later, the app calls /api/ and nginx sends that to the server.',
        messages: [
          {
            from: 'host',
            to: 'nginx',
            name: 'GET /',
            info: 'dev.livepoll.com goes to edit-app',
            kind: 'request',
            payload: { host: 'dev.livepoll.com', path: '/' },
            fields: [
              ['host', 'Picks the app. dev.livepoll.com is the edit app.'],
              ['path', 'Anything that is not /api/ or /ws/ goes to the Vite app.'],
            ],
          },
          {
            from: 'host',
            to: 'api',
            name: 'GET /api/edit/livepolls',
            info: 'A follow-up API call',
            kind: 'read',
            note: 'The mcp-server calls this same route to list polls.',
          },
        ],
      },
      {
        title: 'The audience opens the take app',
        text: 'People visit dev.livepoll.io. The take app asks the API to look up the session PIN.',
        messages: [
          {
            from: 'phone',
            to: 'nginx',
            name: 'GET /enter-pin',
            info: 'dev.livepoll.io goes to take-app',
            kind: 'request',
            payload: { host: 'dev.livepoll.io', path: '/enter-pin' },
            fields: [
              ['host', 'dev.livepoll.io is the audience hostname.'],
              ['path', 'The take app route where people type the PIN.'],
            ],
          },
          {
            from: 'phone',
            to: 'api',
            name: 'GET /api/take/pin/:pin',
            info: 'Looks up the active session',
            kind: 'request',
            payload: { pin: 4829 },
            fields: [['pin', 'Path parameter. The server parses it as an integer and finds the active session.']],
          },
        ],
      },
      {
        title: 'Reports load',
        text: 'The reports app lives on its own hostname. It loads a dashboard page, then fetches the report from the same API server.',
        messages: [
          {
            from: 'report',
            to: 'nginx',
            name: 'GET /dev/dashboard/:uid',
            info: 'reports.dev.livepoll.com goes to reports-app',
            kind: 'request',
            payload: { host: 'reports.dev.livepoll.com', path: '/dev/dashboard/<uid>' },
            fields: [
              ['host', 'The reports hostname.'],
              ['path', 'The reports app has no route at /. The path is /:dc/dashboard/:uid.'],
            ],
          },
          {
            from: 'report',
            to: 'api',
            name: 'GET /api/take/sharable-report/livepoll-session/report/:uid',
            info: 'Same server_upstream as the other apps',
            kind: 'request',
            payload: { uid: '<uuid>' },
            fields: [['uid', 'Path parameter. The share id of the session. See the Reports lesson.']],
          },
        ],
      },
      {
        title: '/ws/ is the exception',
        text: 'The edit hostname forwards /ws/ with the Upgrade headers, so a connection there can switch to a WebSocket. The How WebSockets work lesson follows that path.',
        messages: [
          {
            from: 'host',
            to: 'api',
            name: 'GET /ws/admin',
            info: 'nginx keeps the Upgrade headers',
            kind: 'request',
            payload: { Upgrade: '$http_upgrade', Connection: '$connection_upgrade' },
            fields: [
              ['Upgrade', 'nginx passes the client’s Upgrade header on to the server.'],
              ['Connection', 'Set from the Upgrade value, so the switch to WebSocket can happen.'],
            ],
            note: 'Only the dev.livepoll.com host has a location for ^/ws/.',
          },
        ],
      },
    ],
  };

  /* ---------- 2 · session ---------- */
  const session = {
    id: 'session',
    title: 'Start a session',
    subtitle: 'Session, PIN and the presenter socket',
    concept: {
      title: 'Start a session',
      subtitle: 'A session is one run of a poll.',
      paragraph:
        'When you press Present, the edit app creates a session over REST. The server picks a free PIN and saves the session and its stats in one MySQL transaction. The session also gets a share id for reports. Then the presenter opens a Socket.IO connection to the admin namespace and joins the session’s admin room. Ending the session closes it in MySQL and tells everyone.',
      repo: [
        'server/src/take-livepoll/controllers/livepoll-session.controller.ts',
        'server/src/take-livepoll/services/pin-generator.service.ts',
        'server/src/take-livepoll/services/livepoll-session.service.ts',
        'server/src/take-livepoll/web-sockets/admin/admin.gateway.ts',
        'server/src/take-livepoll/services/admin-room.service.ts',
        'server/src/take-livepoll/services/livepoll-session-engine.service.ts',
        'client/apps/edit-app/src/contexts/socketContext.tsx',
      ],
    },
    scene: {
      zones: [
        { id: 'browsers', label: 'Browsers', sub: 'your machine', kind: 'local', x: 16, y: 24, w: 200, h: 492 },
        { id: 'server', label: 'LivePoll server', sub: 'NestJS', kind: 'remote', x: 344, y: 24, w: 444, h: 492 },
      ],
      objects: [
        { id: 'host', type: 'laptop', at: [116, 270], scale: 0.75, name: 'Host', sub: 'edit-app' },
        { id: 'nginx', type: 'router', at: [280, 270], scale: 0.7, name: 'nginx' },
        { id: 'api', type: 'serverStack', at: [450, 270], scale: 0.85, name: 'API server', sub: 'NestJS' },
        { id: 'db', type: 'database', at: [690, 160], scale: 0.85, name: 'MySQL', sub: 'sessions' },
        { id: 'redis', type: 'redisCube', at: [690, 390], scale: 0.85, name: 'Redis', sub: 'respondent info' },
      ],
      conns: [
        { id: 'host-nginx', from: 'host', to: 'nginx', label: 'HTTPS' },
        { id: 'nginx-api', from: 'nginx', to: 'api' },
        { id: 'api-db', from: 'api', to: 'db', label: 'SQL' },
        { id: 'api-redis', from: 'api', to: 'redis' },
      ],
    },
    steps: [
      {
        title: 'The host creates a session',
        text: 'Pressing Present sends a POST. The body holds the session settings.',
        messages: [
          {
            from: 'host',
            to: 'api',
            name: 'POST /api/take/:livePollId/livepoll-sessions',
            info: 'Creates a session for this poll',
            kind: 'request',
            payload: {
              name: 'Team lunch',
              responseTimeLimitInSecs: 30,
              anonymousResponses: false,
              teamSetting: { enabled: false },
            },
            fields: [
              ['name', 'Optional name of the session.'],
              ['responseTimeLimitInSecs', 'How long people have to answer a question.'],
              ['anonymousResponses', 'Optional. Hides real names when true.'],
              ['teamSetting', 'Team options. enabled is required.'],
              ['meetingPlatform', 'Optional. Set when the session runs inside a meeting app.'],
              ['meetingId', 'Optional. The meeting the session belongs to.'],
            ],
          },
        ],
      },
      {
        title: 'The server picks a PIN and saves the rows',
        text: 'The server draws a random PIN and retries while an active session already has it. Then it saves the session and its stats row in one transaction.',
        messages: [
          {
            from: 'api',
            to: 'db',
            name: 'SELECT active session by pin',
            info: 'Is this PIN free?',
            kind: 'read',
            payload: { pin: 4829 },
            fields: [['pin', 'A random number in the allowed PIN range. The server draws again if an active session has it.']],
          },
          {
            from: 'api',
            to: 'db',
            name: 'INSERT session and stats',
            info: 'One MySQL transaction',
            kind: 'write',
            payload: { pin: 4829, sharableReportDashboardUid: '<uuid>' },
            fields: [
              ['pin', 'The PIN people type to join.'],
              ['sharableReportDashboardUid', 'A UUID set when the session is created. Reports use it later.'],
            ],
            note: 'The session is also added to an in-memory cache in the server, so a PIN lookup can skip MySQL.',
          },
        ],
      },
      {
        title: 'The presenter socket connects',
        text: 'The edit app opens a Socket.IO connection to the admin namespace. The server checks the login cookie and refuses the socket if nobody is logged in.',
        messages: [
          {
            from: 'host',
            to: 'api',
            name: 'socket.io /ws/admin',
            info: 'Needs a logged-in user',
            kind: 'request',
            payload: { url: 'https://dev.livepoll.com/admin', path: '/ws/admin', withCredentials: true },
            fields: [
              ['url', 'The admin namespace on the edit hostname.'],
              ['path', 'Transport path. nginx forwards /ws/ with the Upgrade headers.'],
              ['withCredentials', 'Sends the session cookie. Without a logged-in user the server answers Unauthorized with code 403.'],
            ],
          },
        ],
      },
      {
        title: 'The presenter joins the admin room',
        text: 'The server checks that the user is the host or a co-host. Then it adds the socket to the session’s admin room and acknowledges.',
        messages: [
          {
            from: 'host',
            to: 'api',
            name: 'admin:join.session',
            info: 'Joins room.admin.session.<id>',
            kind: 'request',
            payload: { livePollSessionId: 1042 },
            fields: [['livePollSessionId', 'The session to join.']],
          },
          {
            from: 'api',
            to: 'host',
            name: 'ack { joined }',
            info: 'Host or co-host is allowed in',
            kind: 'event',
            payload: { joined: true },
            fields: [['joined', 'false when the session is unknown or the user is neither host nor co-host.']],
          },
        ],
      },
      {
        title: 'The session ends',
        text: 'Finishing the session marks it completed. The server tells the audience and the presenter, then clears the respondent info it kept in Redis.',
        messages: [
          {
            from: 'host',
            to: 'api',
            name: 'admin:finish.livepoll-session',
            info: 'Ends the session',
            kind: 'request',
            payload: { livePollSessionId: 1042 },
            fields: [['livePollSessionId', 'The session to finish.']],
          },
          {
            from: 'api',
            to: 'db',
            name: 'UPDATE session',
            info: 'State COMPLETED, completedAt set',
            kind: 'write',
            payload: { state: 'COMPLETED', completedAt: '<timestamp>' },
            fields: [
              ['state', 'The session state after finishing.'],
              ['completedAt', 'When the session finished.'],
            ],
            note: 'The cached copy is updated too. The server also broadcasts respondent:livepoll-session.finished to the audience room and admin:sync.session.ended to the admin room.',
          },
          {
            from: 'api',
            to: 'redis',
            name: 'remove respondent info',
            info: 'Clears cached respondent details',
            kind: 'write',
            note: 'removeAllRespondentsInfoFromCache for this session.',
          },
        ],
      },
    ],
  };

  /* ---------- 3 · join ---------- */
  const join = {
    id: 'join',
    title: 'Join with a PIN',
    subtitle: 'From PIN to a live socket',
    concept: {
      title: 'Join with a PIN',
      subtitle: 'Two REST calls, then a socket.',
      paragraph:
        'A phone first looks up the PIN, then posts its name to join. The server creates the respondent row and returns it. The take app keeps that info so a closed tab can rejoin, then opens a Socket.IO connection to the respondent namespace. There is no login. The server trusts the respondent id in the handshake only after it checks it. On connect the socket joins the session room, and the presenter hears about it.',
      repo: [
        'server/src/take-livepoll/controllers/pin-validator.controller.ts',
        'server/src/take-livepoll/services/respondent.service.ts',
        'client/apps/take-app/src/screens/enter-pin/EnterPinScreen.tsx',
        'client/apps/take-app/src/contexts/allowOneSocketConnectionContext.tsx',
        'server/src/take-livepoll/web-sockets/respondent/respondent.gateway.ts',
        'server/src/take-livepoll/services/respondent-room.service.ts',
      ],
    },
    scene: {
      zones: [
        { id: 'browsers', label: 'Browsers', sub: 'your machine', kind: 'local', x: 16, y: 24, w: 240, h: 492 },
        { id: 'server', label: 'LivePoll server', sub: 'NestJS', kind: 'remote', x: 400, y: 24, w: 388, h: 492 },
      ],
      objects: [
        {
          id: 'presenter',
          type: 'presenterScreen',
          at: [136, 215],
          scale: 0.7,
          name: 'Presenter',
          sub: 'admin socket',
          opts: { title: 'Best team lunch?', labels: lunch, mode: 'pin' },
        },
        { id: 'phone', type: 'phone', at: [136, 425], name: 'Phone', sub: 'take-app' },
        { id: 'nginx', type: 'router', at: [320, 280], scale: 0.7, name: 'nginx' },
        { id: 'api', type: 'serverStack', at: [500, 280], scale: 0.85, name: 'API server', sub: 'NestJS' },
        { id: 'db', type: 'database', at: [690, 280], scale: 0.85, name: 'MySQL', sub: 'respondents' },
      ],
      conns: [
        { id: 'pres-nginx', from: 'presenter', to: 'nginx', label: 'WS' },
        { id: 'phone-nginx', from: 'phone', to: 'nginx', label: 'HTTPS' },
        { id: 'nginx-api', from: 'nginx', to: 'api' },
        { id: 'api-db', from: 'api', to: 'db', label: 'SQL' },
      ],
    },
    steps: [
      {
        title: 'Look up the PIN',
        text: 'The phone sends the typed PIN. The server finds the active session with that PIN.',
        messages: [
          {
            from: 'phone',
            to: 'api',
            name: 'GET /api/take/pin/:pin',
            info: 'Is there an active session?',
            kind: 'request',
            payload: { pin: 4829 },
            fields: [['pin', 'Path parameter. The server parses it as an integer.']],
            note: 'The reply has id, name, anonymousResponses and isPreview. It is a 404 when no active session has the PIN.',
          },
          {
            from: 'api',
            to: 'db',
            name: 'SELECT active session by pin',
            info: 'Finds the session',
            kind: 'read',
            payload: { pin: 4829 },
            fields: [['pin', 'The PIN from the path.']],
          },
        ],
      },
      {
        title: 'Join with a name',
        text: 'The phone posts the PIN and a name. The server inserts a respondent row and returns it. The app saves the session info, then opens /take/:livePollSessionId/:respondentId.',
        messages: [
          {
            from: 'phone',
            to: 'api',
            name: 'POST /api/take/pin',
            info: 'Joins the session',
            kind: 'request',
            payload: { pin: 4829, name: 'Maria', participantKey: '<key>' },
            fields: [
              ['pin', 'The session PIN.'],
              ['name', 'The name the person typed. Replaced by a generated name when responses are anonymous.'],
              ['participantKey', 'A key the app keeps, so the same device is recognised.'],
              ['ltiLaunchId', 'Optional. Only sent for LMS launches.'],
            ],
          },
          {
            from: 'api',
            to: 'db',
            name: 'INSERT respondent',
            info: 'A new respondent row',
            kind: 'write',
            note: 'respondentService.joinPresenterSession creates the row. The respondent info is also cached in Redis.',
          },
          {
            from: 'api',
            to: 'phone',
            name: '200 respondent and session',
            info: 'The phone keeps this and moves on',
            kind: 'event',
            payload: {
              respondent: { id: 77, uid: '<respondent uid>', respondentName: 'Maria', teamUid: null, livePollSessionId: 1042 },
              livePollSession: { name: 'Team lunch', pin: 4829 },
            },
            fields: [
              ['respondent', 'The new respondent. uid is what the socket handshake uses.'],
              ['livePollSession', 'Name and PIN of the session.'],
            ],
            note: 'The take app also reads profileQuestions and teamId from this response. The server’s declared response type has only the two fields shown.',
          },
        ],
      },
      {
        title: 'The respondent socket connects',
        text: 'The phone opens a Socket.IO connection to the respondent namespace. No login cookie is used. The handshake carries the respondent id, and the server checks it.',
        messages: [
          {
            from: 'phone',
            to: 'api',
            name: 'socket.io /api/respondent',
            info: 'Handshake with auth',
            kind: 'request',
            payload: {
              url: 'https://dev.livepoll.io/respondent',
              path: '/api/respondent',
              auth: { respondentId: '<respondent uid>', livePollSessionId: 1042 },
            },
            fields: [
              ['url', 'The respondent namespace on the take hostname.'],
              ['path', 'Transport path.'],
              ['auth', 'Read from handshake.auth. The server rejects with code 403 if the respondent does not check out.'],
            ],
            note: 'The client also sets withCredentials and closeOnBeforeunload.',
          },
          {
            from: 'api',
            to: 'db',
            name: 'find respondent',
            info: 'Cache first, then MySQL',
            kind: 'read',
            note: 'getValidatedRespondentDetails loads the respondent from the cache or the database. It throws if it is not found.',
          },
        ],
      },
      {
        title: 'The socket joins the room',
        text: 'On connect the server adds the socket to the session room. It tells the presenter and sends the connected count to the audience.',
        messages: [
          {
            from: 'api',
            to: 'presenter',
            name: 'admin:respondent.joined',
            info: 'The presenter adds Maria',
            kind: 'event',
            note: 'Sent to room.admin.session.<id>. The payload is the respondent.',
          },
          {
            from: 'api',
            to: 'phone',
            name: 'respondent:join.other.respondent',
            info: 'Connected count for the room',
            kind: 'broadcast',
            payload: { connectedRespondents: 1 },
            fields: [['connectedRespondents', 'How many respondents are connected. It counts people, not sockets.']],
            note: 'Sent to room.livepoll-session.<id>, which this socket has just joined.',
          },
        ],
      },
    ],
  };

  /* ---------- 4 · sockets ---------- */
  const sockets = {
    id: 'sockets',
    title: 'How WebSockets work',
    subtitle: 'Handshake, rooms, heartbeats, reconnects',
    concept: {
      title: 'How WebSockets work',
      subtitle: 'Socket.IO starts with HTTP, then upgrades.',
      paragraph:
        'LivePoll uses Socket.IO. A connection starts as plain HTTP long polling. The client then asks to switch the same connection to a WebSocket. The server has two namespaces: admin for the presenter and respondent for phones. Each one has its own way to sign in. Rooms group the sockets of one session, so the server can emit to everyone in it. A heartbeat finds dead sockets, and clients reconnect on their own.',
      repo: [
        'server/src/common/utils/socket-transports-option.util.ts',
        'server/src/take-livepoll/web-sockets/admin/admin.gateway.ts',
        'server/src/take-livepoll/web-sockets/respondent/respondent.gateway.ts',
        'server/src/take-livepoll/services/admin-room.service.ts',
        'server/src/take-livepoll/services/respondent-room.service.ts',
        'client/apps/edit-app/src/contexts/runLivePollSessionContext.tsx',
        'client/apps/take-app/src/contexts/takeLivePollStateContext.tsx',
      ],
    },
    scene: {
      zones: [
        { id: 'browsers', label: 'Browsers', sub: 'your machine', kind: 'local', x: 16, y: 24, w: 232, h: 492 },
        { id: 'server', label: 'LivePoll server', sub: 'admin and respondent namespaces', kind: 'remote', x: 504, y: 24, w: 284, h: 492 },
      ],
      objects: [
        { id: 'host', type: 'laptop', at: [132, 160], scale: 0.75, name: 'Host', sub: 'admin socket' },
        { id: 'phone', type: 'phone', at: [132, 380], name: 'Phone', sub: 'respondent socket' },
        { id: 'nginx', type: 'router', at: [376, 270], scale: 0.7, name: 'nginx' },
        { id: 'srv', type: 'serverStack', at: [646, 270], scale: 1.1, name: 'Socket.IO server', sub: 'NestJS' },
      ],
      conns: [
        { id: 'host-nginx', from: 'host', to: 'nginx', label: 'WS' },
        { id: 'phone-nginx', from: 'phone', to: 'nginx', label: 'WS' },
        { id: 'nginx-srv', from: 'nginx', to: 'srv' },
      ],
    },
    steps: [
      {
        title: 'The handshake is plain HTTP',
        text: 'The client first sends an HTTP long-polling request. The server answers with a session id and the heartbeat settings.',
        messages: [
          {
            from: 'host',
            to: 'srv',
            name: 'GET /ws/admin (polling)',
            info: 'First request, over HTTP',
            kind: 'request',
            payload: { EIO: 4, transport: 'polling' },
            fields: [
              ['EIO', 'Engine.IO protocol version. Socket.IO 4 uses 4.'],
              ['transport', 'The server allows polling and websocket. A client starts with polling.'],
            ],
          },
          {
            from: 'srv',
            to: 'host',
            name: 'handshake reply',
            info: 'Session id and settings',
            kind: 'event',
            payload: { sid: '<sid>', upgrades: ['websocket'], pingInterval: 20000, pingTimeout: 15000 },
            fields: [
              ['sid', 'Id of this connection.'],
              ['upgrades', 'Transports the client may switch to.'],
              ['pingInterval', 'Milliseconds between pings. Both gateways set 20 seconds.'],
              ['pingTimeout', 'Milliseconds to wait for a pong. Both gateways set 15 seconds.'],
            ],
          },
        ],
      },
      {
        title: 'The connection upgrades',
        text: 'The client asks to switch the same connection to WebSocket. The server agrees with a 101 reply. nginx must pass the Upgrade and Connection headers, and it does on the /ws/ block.',
        messages: [
          {
            from: 'host',
            to: 'srv',
            name: 'GET /ws/admin (Upgrade)',
            info: 'Asks to switch to WebSocket',
            kind: 'request',
            payload: { transport: 'websocket', sid: '<sid>', Upgrade: 'websocket', Connection: 'Upgrade' },
            fields: [
              ['sid', 'The id from the handshake. It keeps the same connection.'],
              ['Upgrade', 'Asks for a different protocol.'],
              ['Connection', 'Tells proxies the Upgrade header is for this hop.'],
            ],
          },
          {
            from: 'srv',
            to: 'host',
            name: '101 Switching Protocols',
            info: 'The connection is now a WebSocket',
            kind: 'event',
            note: 'After this, messages travel as WebSocket frames. Polling stops.',
          },
        ],
      },
      {
        title: 'Two namespaces, two sign-ins',
        text: 'The admin namespace trusts the login cookie. The respondent namespace trusts a respondent id sent in the handshake.',
        messages: [
          {
            from: 'host',
            to: 'srv',
            name: 'connect /admin',
            info: 'Login cookie',
            kind: 'request',
            payload: { path: '/ws/admin', withCredentials: true },
            fields: [
              ['path', 'Admin transport path.'],
              ['withCredentials', 'express-session and passport read the cookie. No user means Unauthorized, code 403.'],
            ],
          },
          {
            from: 'phone',
            to: 'srv',
            name: 'connect /respondent',
            info: 'Respondent id in the handshake',
            kind: 'request',
            payload: { path: '/api/respondent', auth: { respondentId: '<respondent uid>', livePollSessionId: 1042 } },
            fields: [
              ['path', 'Respondent transport path.'],
              ['auth', 'Checked on the server. A viewer can send spectator: true instead. Spectators join the room but are not counted.'],
            ],
          },
        ],
      },
      {
        title: 'Rooms group the sockets',
        text: 'A room is a list of sockets inside a namespace. The server emits to a room to reach everyone in it. There is no explicit leave. Disconnecting leaves every room.',
        messages: [
          {
            from: 'host',
            to: 'srv',
            name: 'admin:join.session',
            info: 'Joins room.admin.session.<id>',
            kind: 'request',
            payload: { livePollSessionId: 1042 },
            fields: [['livePollSessionId', 'The session whose admin room to join.']],
            note: 'Phones need no event. They join room.livepoll-session.<id> as soon as they connect.',
          },
          {
            from: 'srv',
            to: ['host', 'phone'],
            toLabel: 'Host and phone',
            name: 'server.to(room).emit',
            info: 'One emit reaches the whole room',
            kind: 'broadcast',
            note: 'The admin room gets admin:* events. The session room gets respondent:* events.',
          },
        ],
      },
      {
        title: 'A heartbeat finds dead sockets',
        text: 'The server pings every 20 seconds. If no pong comes back within 15 seconds, it drops the socket.',
        messages: [
          {
            from: 'srv',
            to: 'phone',
            name: 'ping',
            info: 'Every 20 seconds',
            kind: 'event',
            note: 'Sent by Engine.IO, not by app code.',
          },
          {
            from: 'phone',
            to: 'srv',
            name: 'pong',
            info: 'Must arrive within 15 seconds',
            kind: 'request',
            note: 'No pong in time means the server closes the socket.',
          },
          {
            from: 'host',
            to: 'srv',
            name: 'ping-pong',
            info: 'An app-level event on the admin gateway',
            kind: 'request',
            note: 'The admin gateway answers with the text pong: followed by the time.',
          },
        ],
      },
      {
        title: 'Disconnects',
        text: 'A closed tab drops the phone right away. The presenter hears that the person left only when they have no other live socket. A logout disconnects the admin socket.',
        messages: [
          {
            from: 'phone',
            to: 'srv',
            name: 'tab closed',
            info: 'closeOnBeforeunload',
            kind: 'request',
            note: 'The client closes the socket when the tab closes or reloads. Without it the server would wait for the ping timeout.',
          },
          {
            from: 'srv',
            to: 'host',
            name: 'admin:respondent.left',
            info: 'Only if no other socket remains',
            kind: 'event',
            note: 'handleDisconnect checks the respondent’s other sockets first. It then sends the new connected count to the session room.',
          },
          {
            from: 'srv',
            to: 'host',
            name: 'socket.disconnect()',
            info: 'The host logs out',
            kind: 'event',
            note: 'The admin gateway listens for the logout:<userId> event and disconnects that user’s socket.',
          },
        ],
      },
      {
        title: 'Clients reconnect and resync',
        text: 'The Socket.IO client reconnects by itself. The edit app joins the admin room again on every connect. The take app asks for the current state.',
        messages: [
          {
            from: 'host',
            to: 'srv',
            name: 'admin:join.session',
            info: 'Sent again after each connect',
            kind: 'request',
            payload: { livePollSessionId: 1042 },
            fields: [['livePollSessionId', 'Rooms are lost on disconnect, so the edit app joins again.']],
          },
          {
            from: 'phone',
            to: 'srv',
            name: 'respondent:sync',
            info: 'Fetches the current state',
            kind: 'request',
            note: 'The take app emits this on connect and reconnect to restore the session state.',
          },
        ],
      },
    ],
  };

  /* ---------- 5 · vote ---------- */
  const startDto = {
    payload: { livePollSessionId: 1042, questionId: '<question uuid>' },
    fields: [
      ['livePollSessionId', 'The running session to act on.'],
      ['questionId', 'UUID of the question.'],
    ],
  };
  const vote = {
    id: 'vote',
    title: 'A live vote',
    subtitle: 'One question, start to finish',
    concept: {
      title: 'A live vote',
      subtitle: 'A vote is a short chain of Socket.IO events.',
      paragraph:
        'The presenter talks to the admin namespace. Phones talk to the respondent namespace. Each step saves to MySQL before the server tells anyone. Choice is one of seven question types: CHOICE, LIVE_FEED, WORD_CLOUD, SWIPE, RATING, RANKING and HEATMAP.',
      repo: [
        'server/src/take-livepoll/constants/events.constants.ts',
        'server/src/take-livepoll/web-sockets/admin/admin.gateway.ts',
        'server/src/take-livepoll/web-sockets/respondent/respondent.gateway.ts',
        'server/src/take-livepoll/services/livepoll-session-engine.service.ts',
        'server/src/take-livepoll/services/response-collector.service.ts',
        'server/src/take-livepoll/services/finish-question.service.ts',
        'server/src/edit-livepoll/entities/question-type.enum.ts',
      ],
    },
    scene: {
      voteCap: 3,
      zones: [
        { id: 'browsers', label: 'Browsers', sub: 'your machine', kind: 'local', x: 16, y: 24, w: 284, h: 492 },
        { id: 'server', label: 'LivePoll server', sub: 'NestJS', kind: 'remote', x: 430, y: 24, w: 358, h: 492 },
      ],
      objects: [
        {
          id: 'presenter',
          type: 'presenterScreen',
          at: [158, 245],
          scale: 0.9,
          name: 'Presenter',
          sub: 'admin socket',
          opts: { title: 'Best team lunch?', labels: lunch, mode: 'q' },
        },
        { id: 'p1', type: 'phone', at: [66, 430], name: 'Phone 1', opts: { choice: 0 } },
        { id: 'p2', type: 'phone', at: [158, 430], name: 'Phone 2', opts: { choice: 1 } },
        { id: 'p3', type: 'phone', at: [250, 430], name: 'Phone 3', opts: { choice: 0 } },
        { id: 'nginx', type: 'router', at: [365, 290], scale: 0.7, name: 'nginx' },
        { id: 'srv', type: 'serverStack', at: [570, 200], scale: 0.85, name: 'API server', sub: 'NestJS' },
        { id: 'db', type: 'database', at: [660, 410], scale: 0.85, name: 'MySQL', sub: 'responses' },
      ],
      conns: [
        { id: 'pres-nginx', from: 'presenter', to: 'nginx', label: 'WS' },
        { id: 'p1-nginx', from: 'p1', to: 'nginx' },
        { id: 'p2-nginx', from: 'p2', to: 'nginx' },
        { id: 'p3-nginx', from: 'p3', to: 'nginx' },
        { id: 'nginx-srv', from: 'nginx', to: 'srv' },
        { id: 'srv-db', from: 'srv', to: 'db', label: 'SQL' },
      ],
    },
    steps: [
      {
        title: 'The presenter starts a question',
        text: 'You press Start. The presenter screen sends admin:start.question. The server saves a timer and the new session state in one transaction.',
        messages: [
          {
            from: 'presenter',
            to: 'srv',
            name: 'admin:start.question',
            info: 'Starts "Best team lunch?"',
            kind: 'request',
            ...startDto,
          },
          {
            from: 'srv',
            to: 'db',
            name: 'INSERT timer, UPDATE state',
            info: 'State becomes QUESTION_STARTED',
            kind: 'write',
            note: 'The timer row and the session state change commit together. The server then caches the question and timer.',
          },
        ],
      },
      {
        title: 'Every phone gets the question',
        text: 'The server broadcasts respondent:start.question to the session room. All phones receive it.',
        messages: [
          {
            from: 'srv',
            to: ['p1', 'p2', 'p3'],
            toLabel: 'Phones 1 to 3',
            name: 'respondent:start.question',
            info: 'Question and timer go to the room',
            kind: 'broadcast',
            payload: { question: '…', livePollSession: '…', questionResponseTimer: '…' },
            fields: [
              ['question', 'The question as respondents see it. Correct answers are removed.'],
              ['livePollSession', 'The running session.'],
              ['questionResponseTimer', 'Timer for this question.'],
            ],
            set: { modes: { p1: 'q', p2: 'q', p3: 'q' } },
          },
        ],
      },
      {
        title: 'Phones submit votes',
        text: 'Each phone sends respondent:answer.question. The server inserts the response into MySQL before it does anything else.',
        messages: [
          {
            from: 'p1',
            to: 'srv',
            name: 'respondent:answer.question',
            info: 'Phone 1 taps Pizza',
            kind: 'request',
            payload: { type: 0, questionResponseTimerId: 7, questionId: '<question uuid>', answerId: '<answer uuid>' },
            fields: [
              ['type', 'Session type. 0 is PRESENTER_SESSION.'],
              ['questionResponseTimerId', 'Which timer run this answer belongs to.'],
              ['questionId', 'UUID of the question.'],
              ['answerId', 'UUID of the option the person tapped.'],
            ],
            set: { modes: { p1: 'v' } },
          },
          {
            from: 'p2',
            to: 'srv',
            name: 'respondent:answer.question',
            info: 'Phone 2 taps Tacos',
            kind: 'request',
            payload: { type: 0, questionResponseTimerId: 7, questionId: '<question uuid>', answerId: '<answer uuid>' },
            fields: [
              ['type', 'Session type. 0 is PRESENTER_SESSION.'],
              ['questionResponseTimerId', 'Which timer run this answer belongs to.'],
              ['questionId', 'UUID of the question.'],
              ['answerId', 'UUID of the option the person tapped.'],
            ],
            set: { modes: { p2: 'v' } },
          },
          {
            from: 'srv',
            to: 'db',
            name: 'INSERT choice response',
            info: 'One row per respondent and question',
            kind: 'write',
            payload: { respondentId: 77, questionId: '<question uuid>', answerId: '<answer uuid>', score: 0, correct: false, timeTakenInMs: 2400 },
            fields: [
              ['respondentId', 'Who answered.'],
              ['questionId', 'UUID of the question.'],
              ['answerId', 'The chosen option.'],
              ['score', 'Points for this answer.'],
              ['correct', 'Whether the option is marked correct.'],
              ['timeTakenInMs', 'Time since the question started, minus any pause.'],
            ],
            note: 'The insert is awaited, in a transaction with the respondent’s time and score. A unique constraint on respondent and question blocks a second answer.',
          },
        ],
      },
      {
        title: 'The presenter bars grow',
        text: 'For each saved vote the server emits admin:question.answered to the admin room. The presenter screen adds one to the matching bar.',
        messages: [
          {
            from: 'srv',
            to: 'presenter',
            name: 'admin:question.answered',
            info: 'Pizza gets its first vote',
            kind: 'event',
            payload: [{ respondentName: 'Maria', teamUid: null }],
            fields: [
              ['(array)', 'One entry per answer in this response.'],
              ['respondentName', 'Name the person typed when joining.'],
              ['teamUid', 'Team of the respondent, or null.'],
              ['…', 'The stored choice response fields are spread into each entry.'],
            ],
            set: { modes: { presenter: 'res' }, votes: [1, 0, 0, 0] },
          },
          {
            from: 'srv',
            to: 'presenter',
            name: 'admin:question.answered',
            info: 'Tacos gets its first vote',
            kind: 'event',
            payload: [{ respondentName: 'Sam', teamUid: null }],
            fields: [
              ['(array)', 'One entry per answer in this response.'],
              ['respondentName', 'Name the person typed when joining.'],
              ['teamUid', 'Team of the respondent, or null.'],
              ['…', 'The stored choice response fields are spread into each entry.'],
            ],
            set: { votes: [1, 1, 0, 0] },
          },
        ],
      },
      {
        title: 'The question finishes',
        text: 'You press Finish. The server sets the timer’s end time to now if it is still open. Then it sends results to the phones and a sync event to the presenter.',
        messages: [
          {
            from: 'presenter',
            to: 'srv',
            name: 'admin:finish.question',
            info: 'Closes the question',
            kind: 'request',
            ...startDto,
          },
          {
            from: 'srv',
            to: ['p1', 'p2', 'p3'],
            toLabel: 'Phones 1 to 3',
            name: 'respondent:finish.question',
            info: 'Results and scores',
            kind: 'broadcast',
            set: { modes: { p1: 'done', p2: 'done', p3: 'done' } },
            payload: { question: '…', livePollSession: '…', respondentScores: '…', teamLeaderboard: '…' },
            fields: [
              ['question', 'The finished question with its results.'],
              ['livePollSession', 'The running session.'],
              ['respondentScores', 'A partial leaderboard around this respondent.'],
              ['teamLeaderboard', 'Scores per team.'],
            ],
            note: 'For choice questions the server sends this to each connected socket, so each phone gets its own leaderboard slice. The Scaling with Redis lesson shows how.',
          },
          {
            from: 'srv',
            to: 'presenter',
            name: 'admin:sync.question.finished',
            info: 'The admin room learns it finished',
            kind: 'event',
            note: 'Sent to the admin room with the finished question’s result.',
          },
        ],
      },
    ],
  };

  /* ---------- 6 · scale ---------- */
  const scale = {
    id: 'scale',
    title: 'Scaling with Redis',
    subtitle: 'Many servers, one room',
    concept: {
      title: 'Scaling with Redis',
      subtitle: 'A room can span server instances.',
      paragraph:
        'In production several server instances run behind the proxy. Each socket lives on exactly one of them. The socket.io Redis adapter makes a room broadcast on one instance reach the sockets on the others: it publishes to Redis, and every instance emits to its own sockets. LivePoll also publishes one extra Redis channel at question finish, so each instance can send per-person leaderboards. Use the toggle to compare one instance with two.',
      repo: [
        'server/src/adapters/redisio.adapter.ts',
        'server/src/redis/services/external-pub-sub.service.ts',
        'server/src/take-livepoll/services/question-type-handler/choice-question-type-handler.service.ts',
        'server/src/take-livepoll/web-sockets/respondent/respondent.gateway.ts',
        'server/src/take-livepoll/services/livepoll-session-redis-event-service.ts',
      ],
    },
    scene: {
      voteCap: 3,
      single: { alias: { srvB: 'srvA' }, dim: ['srvB', 'redis'] },
      zones: [
        { id: 'browsers', label: 'Browsers', sub: 'your machine', kind: 'local', x: 16, y: 24, w: 284, h: 492 },
        { id: 'server', label: 'LivePoll server', sub: 'NestJS', kind: 'remote', x: 430, y: 24, w: 358, h: 492 },
      ],
      objects: [
        {
          id: 'presenter',
          type: 'presenterScreen',
          at: [158, 245],
          scale: 0.9,
          name: 'Presenter',
          sub: 'admin socket',
          opts: { title: 'Best team lunch?', labels: lunch, mode: 'q' },
        },
        { id: 'p1', type: 'phone', at: [100, 430], name: 'Phone 1', opts: { choice: 0 } },
        { id: 'p2', type: 'phone', at: [216, 430], name: 'Phone 2', opts: { choice: 1 } },
        { id: 'nginx', type: 'router', at: [365, 290], scale: 0.7, name: 'nginx' },
        { id: 'srvA', type: 'serverStack', at: [560, 185], scale: 0.85, name: 'Instance A', sub: 'NestJS' },
        { id: 'srvB', type: 'serverStack', at: [560, 410], scale: 0.85, name: 'Instance B', sub: 'NestJS' },
        { id: 'redis', type: 'redisCube', at: [715, 290], scale: 0.9, name: 'Redis', sub: 'adapter' },
      ],
      conns: [
        { id: 'pres-nginx', from: 'presenter', to: 'nginx', label: 'WS' },
        { id: 'p1-nginx', from: 'p1', to: 'nginx' },
        { id: 'p2-nginx', from: 'p2', to: 'nginx' },
        { id: 'nginx-A', from: 'nginx', to: 'srvA' },
        { id: 'nginx-B', from: 'nginx', to: 'srvB' },
        { id: 'A-redis', from: 'srvA', to: 'redis', label: 'pub/sub' },
        { id: 'B-redis', from: 'srvB', to: 'redis', label: 'pub/sub' },
      ],
    },
    steps: [
      {
        title: 'Each socket lives on one instance',
        text: 'nginx sends each connection to one instance. Here the presenter is on A and the phones are on B.',
        text1: 'There is one instance, so every socket lives on it.',
        messages: [
          {
            from: 'presenter',
            to: 'srvA',
            name: 'socket.io /ws/admin',
            info: 'The presenter lands on A',
            kind: 'request',
          },
          {
            from: 'p1',
            to: 'srvB',
            name: 'socket.io /api/respondent',
            info: 'Phone 1 lands on B',
            kind: 'request',
          },
          {
            from: 'p2',
            to: 'srvB',
            name: 'socket.io /api/respondent',
            info: 'Phone 2 lands on B',
            kind: 'request',
          },
        ],
      },
      {
        title: 'A broadcast from A reaches B',
        text: 'The presenter starts a question on A. The adapter publishes the room broadcast to Redis. B receives it and emits to its own sockets.',
        text1: 'The server broadcasts respondent:start.question to the room. Every socket lives on this one instance, so Redis has nothing to relay.',
        messages: [
          {
            from: 'srvA',
            to: 'redis',
            name: 'redis publish',
            info: 'The adapter shares the room broadcast',
            kind: 'write',
            when: 2,
            note: adapterNote,
          },
          {
            from: 'redis',
            to: 'srvB',
            name: 'redis message',
            info: 'Instance B receives it',
            kind: 'event',
            when: 2,
            note: adapterNote,
          },
          {
            from: 'srvB',
            to: ['p1', 'p2'],
            toLabel: 'Phones 1 and 2',
            name: 'respondent:start.question',
            info: 'B emits to its local sockets',
            kind: 'broadcast',
            payload: { question: '…', livePollSession: '…', questionResponseTimer: '…' },
            fields: [
              ['question', 'The question as respondents see it. Correct answers are removed.'],
              ['livePollSession', 'The running session.'],
              ['questionResponseTimer', 'Timer for this question.'],
            ],
            set: { modes: { p1: 'q', p2: 'q' } },
          },
        ],
      },
      {
        title: 'An answer on B reaches the presenter',
        text: 'A phone answers on B. B emits admin:question.answered to the admin room. Redis relays it to A, where the presenter is connected.',
        text1: 'The answer and the presenter share one process, so the server emits admin:question.answered directly.',
        messages: [
          {
            from: 'srvB',
            to: 'redis',
            name: 'redis publish',
            info: 'The admin room emit goes to Redis',
            kind: 'write',
            when: 2,
            note: adapterNote,
          },
          {
            from: 'redis',
            to: 'srvA',
            name: 'redis message',
            info: 'Instance A receives it',
            kind: 'event',
            when: 2,
            note: adapterNote,
          },
          {
            from: 'srvA',
            to: 'presenter',
            name: 'admin:question.answered',
            info: 'The bar grows',
            kind: 'event',
            payload: [{ respondentName: 'Maria', teamUid: null }],
            fields: [
              ['(array)', 'One entry per answer in this response.'],
              ['respondentName', 'Name the person typed when joining.'],
              ['teamUid', 'Team of the respondent, or null.'],
            ],
            set: { modes: { presenter: 'res' }, votes: [1, 0, 0, 0] },
          },
        ],
      },
      {
        title: 'One extra channel at question finish',
        text: 'When a choice question finishes, the server publishes its own Redis message. Every instance gets it and sends each of its local sockets a personal leaderboard.',
        text1: 'At question finish the server sends each local socket its personal leaderboard. With one instance there is nothing to relay.',
        messages: [
          {
            from: 'srvA',
            to: 'redis',
            name: 'publish QUESTION_FINISHED_RESPONDENT_PARTIAL_LEADERBOARD_CHANNEL',
            info: 'Scores for the finished question',
            kind: 'write',
            when: 2,
            note: 'Sent through ExternalPubSubService, not the socket.io adapter.',
          },
          {
            from: 'redis',
            to: ['srvA', 'srvB'],
            toLabel: 'Instances A and B',
            name: 'redis message',
            info: 'Every instance is subscribed',
            kind: 'event',
            when: 2,
            note: 'Each respondent gateway subscribes to the channel.',
          },
          {
            from: 'srvB',
            to: ['p1', 'p2'],
            toLabel: 'Phones 1 and 2',
            name: 'respondent:finish.question',
            info: 'Each phone gets its own slice',
            kind: 'broadcast',
            payload: { question: '…', livePollSession: '…', respondentScores: '…', teamLeaderboard: '…' },
            fields: [
              ['question', 'The finished question with its results.'],
              ['livePollSession', 'The running session.'],
              ['respondentScores', 'A partial leaderboard around this respondent.'],
              ['teamLeaderboard', 'Scores per team.'],
            ],
            note: 'The instance loops over server.local.fetchSockets(), so it only reaches its own sockets.',
            set: { modes: { p1: 'done', p2: 'done' } },
          },
        ],
      },
    ],
  };

  /* ---------- 7 · reports ---------- */
  const reports = {
    id: 'reports',
    title: 'Reports',
    subtitle: 'In-app report and the public dashboard',
    concept: {
      title: 'Reports',
      subtitle: 'Two ways to read the same session.',
      paragraph:
        'The host sees a full report inside the edit app, after login. It includes each respondent’s answers. Each session also has a share id, a UUID made when the session was created. The reports app uses it to show a public dashboard with no login. The server builds both from MySQL, and both are plain REST. Nothing updates live. Reload the dashboard for fresh numbers.',
      repo: [
        'server/src/take-livepoll/controllers/livepoll-session.controller.ts',
        'server/src/take-livepoll/controllers/sharable-reports.controller.ts',
        'server/src/take-livepoll/services/livepoll-session-report.service.ts',
        'server/src/take-livepoll/services/external-csv-report.service.ts',
        'client/apps/reports-app/src/app.tsx',
        'client/apps/reports-app/src/globals/globals.ts',
      ],
    },
    scene: {
      zones: [
        { id: 'browsers', label: 'Browsers', sub: 'your machine', kind: 'local', x: 16, y: 24, w: 260, h: 492 },
        { id: 'server', label: 'LivePoll server', sub: 'NestJS', kind: 'remote', x: 420, y: 24, w: 368, h: 492 },
      ],
      objects: [
        { id: 'host', type: 'laptop', at: [146, 170], scale: 0.75, name: 'Host', sub: 'edit-app' },
        { id: 'report', type: 'reportSheet', at: [146, 400], scale: 0.85, name: 'Shared dashboard', sub: 'reports-app' },
        { id: 'api', type: 'serverStack', at: [520, 270], scale: 0.9, name: 'API server', sub: 'NestJS' },
        { id: 'db', type: 'database', at: [690, 270], scale: 0.85, name: 'MySQL', sub: 'session data' },
      ],
      conns: [
        { id: 'host-api', from: 'host', to: 'api', label: 'HTTPS' },
        { id: 'report-api', from: 'report', to: 'api', label: 'HTTPS' },
        { id: 'api-db', from: 'api', to: 'db', label: 'SQL' },
      ],
    },
    steps: [
      {
        title: 'The in-app report',
        text: 'A logged-in host opens the report in the edit app. The server returns the session results and each respondent’s answers.',
        messages: [
          {
            from: 'host',
            to: 'api',
            name: 'GET /api/take/:livePollId/livepoll-sessions/:sessionId/report',
            info: 'Needs a logged-in user',
            kind: 'read',
            payload: { pageLimit: '<n>' },
            fields: [['pageLimit', 'Query parameter. Limits the leaderboard rows.']],
            note: 'livePollSessionReportService.getReport builds the answer.',
          },
        ],
      },
      {
        title: 'The share link',
        text: 'The edit app builds a link from the session’s share id. Anyone with the link opens the reports app.',
        messages: [
          {
            from: 'host',
            to: 'report',
            name: 'GET /:dc/dashboard/:uid',
            info: 'Opens the shared dashboard',
            kind: 'request',
            payload: { url: 'https://reports.dev.livepoll.com/dev/dashboard/<uid>' },
            fields: [
              ['url', 'The report URL from the edit app, then /<sharableReportDashboardUid>. In production it is reports.livepolls.questionpro.com/<dc>/dashboard/<uid>.'],
            ],
            note: 'The dc part picks the regional API base URL. An unknown dc falls back to US.',
          },
        ],
      },
      {
        title: 'The public fetch',
        text: 'The reports app calls a public route. No login is needed. The UUID is the only key.',
        messages: [
          {
            from: 'report',
            to: 'api',
            name: 'GET /api/take/sharable-report/livepoll-session/report/:uid',
            info: 'Public. No login.',
            kind: 'request',
            payload: { uid: '<uuid>' },
            fields: [['uid', 'The session’s sharableReportDashboardUid.']],
          },
          {
            from: 'api',
            to: 'report',
            name: '200 report',
            info: 'No respondent-level personal data',
            kind: 'event',
            payload: { livePoll: { id: 12, type: 0 }, livePollSession: '…', livePollSessionReport: '…' },
            fields: [
              ['livePoll', 'Id and type of the poll.'],
              ['livePollSession', 'The session.'],
              ['livePollSessionReport', 'Per-question results. It leaves out each respondent’s answers.'],
            ],
          },
        ],
      },
      {
        title: 'The server builds the report',
        text: 'The server reads the session snapshot first. Then it runs SQL aggregates for each question type.',
        messages: [
          {
            from: 'api',
            to: 'db',
            name: 'read session snapshot',
            info: 'The questions as they were',
            kind: 'read',
            note: 'livePollSessionSnapshotRepository. If there is no snapshot, the server loads the live poll’s questions instead.',
          },
          {
            from: 'api',
            to: 'db',
            name: 'SQL aggregates',
            info: 'One query set per question type',
            kind: 'read',
            note: 'Respondent stats, response counts and per-question reports are read together.',
          },
          {
            from: 'db',
            to: 'api',
            name: 'rows',
            info: 'Counts and scores',
            kind: 'read',
          },
        ],
      },
      {
        title: 'Live feed comments',
        text: 'Comments from a live feed question load in pages, on demand.',
        messages: [
          {
            from: 'report',
            to: 'api',
            name: 'GET /api/take/sharable-report/livepoll-session/:sessionId/question-result/:questionId',
            info: 'One page of comments',
            kind: 'request',
            payload: { liveFeedView: '<view>', pageIndex: '<n>', perPage: '<n>' },
            fields: [
              ['liveFeedView', 'Required. Without it the server answers 400.'],
              ['pageIndex', 'Optional. Defaults to the first page.'],
              ['perPage', 'Optional. Defaults to a fixed page size.'],
            ],
            note: 'pageLimit is also accepted as a query parameter.',
          },
        ],
      },
      {
        title: 'CSV download',
        text: 'A logged-in host starts a download. The file is built in the background, so the app polls the status, then downloads it.',
        messages: [
          {
            from: 'host',
            to: 'api',
            name: 'POST /api/take/:livePollId/livepoll-sessions/:id/report/download',
            info: 'Starts the file',
            kind: 'write',
            note: 'The body may hold a format. CSV is the default. The reply has creationId, creationTime and fileName. The file is built in the background with no queue.',
          },
          {
            from: 'host',
            to: 'api',
            name: 'GET …/report/download/:creationId/status',
            info: 'Poll until it is ready',
            kind: 'read',
            note: 'Progress is read from a server cache.',
          },
          {
            from: 'host',
            to: 'api',
            name: 'GET …/report/download/:creationId',
            info: 'Streams the file',
            kind: 'read',
            note: 'The file is streamed straight onto the response.',
          },
        ],
      },
      {
        title: 'No live updates',
        text: 'The reports app opens no socket and does not poll. Reload the page for fresh numbers.',
        lit: ['report'],
        messages: [],
      },
    ],
  };

  /* ---------- 8 · regions ---------- */
  const regionIds = Object.keys(regions);
  const regionScene = { view: [800, 540], small: true, zones: [], objects: [], conns: [] };
  regionScene.objects.push({
    id: 'global',
    type: 'globalDb',
    at: [400, 72],
    scale: 0.8,
    name: 'Global database',
    sub: 'templates',
    label: { dx: 70, dy: 0, anchor: 'start', big: true },
  });
  regionIds.forEach((r, i) => {
    const x = 16 + i * 156;
    const cx = x + 74;
    regionScene.zones.push({
      id: r,
      label: regions[r].name,
      sub: `DC=${regions[r].name}`,
      kind: 'remote',
      select: true,
      x,
      y: 170,
      w: 148,
      h: 346,
    });
    regionScene.objects.push(
      { id: `${r}-srv`, type: 'serverStack', at: [cx, 310], scale: 0.62, name: 'Server' },
      { id: `${r}-redis`, type: 'redisCube', at: [cx - 36, 420], scale: 0.62, name: 'Redis' },
      { id: `${r}-db`, type: 'database', at: [cx + 36, 420], scale: 0.62, name: 'MySQL' },
    );
    regionScene.conns.push(
      { id: `${r}-s-r`, from: `${r}-srv`, to: `${r}-redis` },
      { id: `${r}-s-d`, from: `${r}-srv`, to: `${r}-db` },
      { id: `${r}-s-g`, from: `${r}-srv`, to: 'global', fa: 'top', ta: 'base', route: 'bus', bus: 140 },
    );
  });

  const regionsLesson = {
    id: 'regions',
    title: 'Regions and data',
    subtitle: 'Five deployments, one global database',
    regionPick: true,
    focus: false,
    concept: {
      title: 'Regions and data',
      subtitle: 'Each region is a full copy. Only templates are shared.',
      paragraph:
        'LivePoll runs in five regions: US, EU, CA, AU and AE. A deployment sets the DC environment variable, and the server uses it to pick a Redis connection string. Each region has its own MySQL database from JAWSDB_URL. A separate global database from GLOBAL_JAWS_DB_URL holds data shared by all regions, such as templates. Click a region in the diagram to follow it.',
      repo: [
        'server/src/common/utils/environment.utils.ts',
        'server/config.ts',
        'server/src/database/migrations-global/',
        'server/global-knexfile.ts',
      ],
    },
    scene: regionScene,
    steps: [
      {
        title: 'A deploy starts with DC={R}',
        text: 'The deployment sets DC={R}. On startup the server reads it to choose a Redis connection string.',
        messages: [
          {
            from: '{r}-srv',
            to: '{r}-redis',
            fromLabel: '{R} server',
            toLabel: '{R} Redis',
            name: 'DC={R}',
            info: 'Picks the Redis URL for {R}',
            kind: 'request',
            payload: { DC: '{R}', redisUrlFrom: '{redis}' },
            fields: [
              ['DC', 'Region code. One of US, EU, CA, AU, AE.'],
              ['redisUrlFrom', 'Environment variable that holds this region’s Redis URL in production.'],
            ],
          },
        ],
      },
      {
        title: 'Reads and writes stay in {R}',
        text: 'The {R} server writes and reads polls and responses in the {R} MySQL database. Other regions never see them.',
        messages: [
          {
            from: '{r}-srv',
            to: '{r}-db',
            fromLabel: '{R} server',
            toLabel: '{R} MySQL',
            name: 'knex write',
            info: 'Saves a response in {R}',
            kind: 'write',
            payload: { connection: 'JAWSDB_URL' },
            fields: [['connection', 'Environment variable with the regional MySQL URL.']],
          },
          {
            from: '{r}-db',
            to: '{r}-srv',
            fromLabel: '{R} MySQL',
            toLabel: '{R} server',
            name: 'query result',
            info: 'Rows come back from {R}',
            kind: 'read',
            payload: { connection: 'JAWSDB_URL' },
            fields: [['connection', 'Same regional database as the write.']],
          },
        ],
      },
      {
        title: 'Templates come from the global database',
        text: 'Templates are the same everywhere, so the {R} server reads them from one global database.',
        messages: [
          {
            from: '{r}-srv',
            to: 'global',
            fromLabel: '{R} server',
            toLabel: 'Global database',
            name: 'knex read',
            info: 'Loads templates',
            kind: 'read',
            payload: { connection: 'GLOBAL_JAWS_DB_URL', migrations: 'server/src/database/migrations-global' },
            fields: [
              ['connection', 'Environment variable with the global MySQL URL.'],
              ['migrations', 'Where the global schema is defined, for example the template table.'],
            ],
          },
        ],
      },
      {
        title: 'Redis stays in the region',
        text: 'Live events use the {R} Redis only. A vote in {R} never reaches another region’s phones.',
        messages: [
          {
            from: '{r}-srv',
            to: '{r}-redis',
            fromLabel: '{R} server',
            toLabel: '{R} Redis',
            name: 'redis publish',
            info: 'Adapter traffic stays in {R}',
            kind: 'write',
            note: 'Internal to the socket.io Redis adapter. It is not part of the public API.',
          },
        ],
      },
    ],
  };

  /* ---------- 9 · integrations ---------- */
  const integrations = {
    id: 'integrations',
    title: 'Integrations',
    subtitle: 'Slides, meetings, chat, LMS, Canva, AI',
    concept: {
      title: 'Integrations',
      subtitle: 'Every integration ends at the same REST API.',
      paragraph:
        'LivePoll lives inside tools people already use. Each one is a thin client with its own folder. They authenticate their own way, then call the API server or reuse the edit app inside the host product.',
      repo: [
        'google-slides-chrome-extension/',
        'client/apps/edit-app/src/meetings-apps/teams-app/',
        'client/apps/edit-app/src/meetings-apps/zoom-app/',
        'server/src/slack/',
        'server/src/lti/',
        'server/src/canva/',
        'mcp-server/src/index.ts',
      ],
    },
    scene: {
      zones: [],
      objects: [
        { id: 'server', type: 'serverStack', at: [400, 305], scale: 1.05, name: 'API server', sub: 'NestJS' },
        { id: 'slides', type: 'pluginTile', at: [120, 110], scale: 0.8, name: 'Google Slides', sub: 'Chrome extension', opts: { glyph: 'slides' } },
        { id: 'teams', type: 'pluginTile', at: [120, 275], scale: 0.8, name: 'Teams', sub: 'meeting app', opts: { glyph: 'meet' } },
        { id: 'zoom', type: 'pluginTile', at: [120, 435], scale: 0.8, name: 'Zoom', sub: 'meeting app', opts: { glyph: 'video' } },
        { id: 'slack', type: 'pluginTile', at: [680, 110], scale: 0.8, name: 'Slack', sub: 'slash command', opts: { glyph: 'chat' } },
        { id: 'lti', type: 'pluginTile', at: [680, 275], scale: 0.8, name: 'LMS', sub: 'LTI', opts: { glyph: 'cap' } },
        { id: 'canva', type: 'pluginTile', at: [680, 435], scale: 0.8, name: 'Canva', sub: 'Canva app', opts: { glyph: 'brush' } },
        { id: 'mcp', type: 'pluginTile', at: [400, 80], scale: 0.8, name: 'MCP server', sub: 'for AI assistants', opts: { glyph: 'chip' } },
      ],
      conns: [
        { id: 'c-slides', from: 'slides', to: 'server', label: 'REST' },
        { id: 'c-teams', from: 'teams', to: 'server', label: 'REST' },
        { id: 'c-zoom', from: 'zoom', to: 'server', label: 'HTTP' },
        { id: 'c-slack', from: 'slack', to: 'server', label: 'HTTP' },
        { id: 'c-lti', from: 'lti', to: 'server', label: 'LTI' },
        { id: 'c-canva', from: 'canva', to: 'server', label: 'REST' },
        { id: 'c-mcp', from: 'mcp', to: 'server', label: 'REST' },
      ],
    },
    steps: [
      {
        title: 'Google Slides',
        text: 'A Chrome extension runs on docs.google.com/presentation. It links each slide to a poll through the API.',
        messages: [
          {
            from: 'slides',
            to: 'server',
            name: '/api/edit/livepolls/:livePollId',
            info: 'Stores the slide id on the poll',
            kind: 'request',
            payload: { livePollId: '<poll id>' },
            fields: [['livePollId', 'Path parameter. The poll that belongs to this slide.']],
            note: 'The extension’s host permissions cover the five regional backends.',
          },
        ],
      },
      {
        title: 'Microsoft Teams',
        text: 'The Teams app opens the edit app in a meeting. It asks the API whether a poll is already running in that meeting.',
        messages: [
          {
            from: 'teams',
            to: 'server',
            name: 'GET /api/take/pin/active-by-meeting/teams/:meetingId',
            info: 'Finds the running session',
            kind: 'request',
            payload: { platform: 'teams', meetingId: '<meeting id>' },
            fields: [
              ['platform', 'Meeting platform enum. Values are teams and lti.'],
              ['meetingId', 'Id of the Teams meeting.'],
            ],
            note: 'The response has livePollId, livePollSessionId, pin and meetingStarterUserId.',
          },
        ],
      },
      {
        title: 'Zoom',
        text: 'The Zoom app is the edit app inside Zoom. Zoom first verifies the domain by fetching a file from the server.',
        messages: [
          {
            from: 'zoom',
            to: 'server',
            name: 'GET /zoomverify/verifyzoom.html',
            info: 'Domain verification',
            kind: 'request',
            note: 'Public route. It returns a fixed text token. It sits outside the /api prefix.',
          },
        ],
      },
      {
        title: 'Slack',
        text: 'Slack sends button clicks to the server. A vote in a channel becomes a LivePoll response.',
        messages: [
          {
            from: 'slack',
            to: 'server',
            name: 'POST /api/slack/internal/vote',
            info: 'A vote from a channel',
            kind: 'write',
            payload: {
              slackPollId: '<poll id>',
              answerId: '<answer id>',
              actionId: '<action id>',
              channelId: '<channel id>',
              teamId: '<workspace id>',
              slackUserId: '<user id>',
              slackUserName: '<user name>',
            },
            fields: [
              ['slackPollId', 'The Slack-side poll.'],
              ['answerId', 'The option that was clicked.'],
              ['channelId', 'Channel where the poll was posted.'],
              ['teamId', 'Slack workspace.'],
              ['slackUserId', 'Who voted.'],
            ],
          },
        ],
      },
      {
        title: 'LMS with LTI',
        text: 'Canvas and other LMS products launch LivePoll with an LTI request. The server validates it and opens the poll.',
        messages: [
          {
            from: 'lti',
            to: 'server',
            name: 'POST /api/lti/launch',
            info: 'LMS launch',
            kind: 'request',
            note: 'The body is the platform’s signed LTI launch. The server publishes jwks.json and a login route for the handshake.',
          },
        ],
      },
      {
        title: 'Canva',
        text: 'The Canva app signs you in with OAuth, then lists your designs through the API.',
        messages: [
          {
            from: 'canva',
            to: 'server',
            name: 'GET /api/canva/designs',
            info: 'Lists your designs',
            kind: 'read',
            note: 'Sign-in uses /api/canva/oauth/authorize and /api/canva/oauth/callback.',
          },
        ],
      },
      {
        title: 'MCP for AI assistants',
        text: 'The MCP server gives an assistant two tools. Both call the REST API with your session cookie, using LIVEPOLL_BASE_URL.',
        messages: [
          {
            from: 'mcp',
            to: 'server',
            name: 'GET /api/edit/livepolls',
            info: 'Tool get_livepolls',
            kind: 'read',
            payload: { pageIndex: 1, perPage: 20, sortBy: '…', sortOrder: '0', viewType: '0', title: 'optional' },
            fields: [
              ['pageIndex', 'Page number from 1.'],
              ['perPage', 'Items per page.'],
              ['sortOrder', '0 for ascending, 1 for descending.'],
              ['viewType', 'Always 0, the list view.'],
              ['title', 'Optional title filter.'],
            ],
            note: 'The second tool, get_livepoll, calls GET /api/edit/livepolls/:id.',
          },
        ],
      },
    ],
  };

  /* ---------- 10 · use ---------- */
  const use = {
    id: 'use',
    title: 'Run a live poll',
    subtitle: 'Five minutes, no setup for the audience',
    plain: true,
    concept: {
      title: 'Run a live poll',
      subtitle: 'Ask a question, share a PIN, watch answers arrive.',
      paragraph:
        'You build the question on your laptop. People join from their phones with a PIN, so nobody installs anything. Results appear on the big screen as votes come in, and you can open a report afterwards.',
      repo: [],
    },
    scene: {
      voteCap: 3,
      zones: [],
      objects: [
        { id: 'host', type: 'laptop', at: [120, 225], scale: 1.1, name: 'You', sub: 'Host' },
        {
          id: 'screen',
          type: 'presenterScreen',
          at: [400, 240],
          scale: 1.1,
          name: 'Big screen',
          sub: 'Everyone sees it',
          opts: { title: 'Best team lunch?', labels: lunch },
        },
        { id: 'report', type: 'reportSheet', at: [680, 225], name: 'Report', sub: 'After the poll' },
        { id: 'pe1', type: 'person', at: [140, 440], scale: 1.1, name: 'Maria' },
        { id: 'p1', type: 'phone', at: [200, 430], scale: 0.9, noLabel: true, opts: { choice: 0 } },
        { id: 'pe2', type: 'person', at: [390, 440], scale: 1.1, name: 'Sam' },
        { id: 'p2', type: 'phone', at: [450, 430], scale: 0.9, noLabel: true, opts: { choice: 1 } },
        { id: 'pe3', type: 'person', at: [640, 440], scale: 1.1, name: 'Lee' },
        { id: 'p3', type: 'phone', at: [700, 430], scale: 0.9, noLabel: true, opts: { choice: 0 } },
      ],
      conns: [
        { id: 'host-screen', from: 'host', to: 'screen' },
        { id: 'screen-report', from: 'screen', to: 'report' },
        { id: 'p1-screen', from: 'p1', to: 'screen' },
        { id: 'p2-screen', from: 'p2', to: 'screen' },
        { id: 'p3-screen', from: 'p3', to: 'screen' },
      ],
    },
    steps: [
      {
        title: 'Create a poll',
        text: 'Type your question and add the options. Here it is “Best team lunch?” with Pizza, Tacos, Sushi and Salad.',
        messages: [
          {
            from: 'host',
            to: 'host',
            who: 'You',
            name: 'Create poll',
            info: 'Type “Best team lunch?” and add Pizza, Tacos, Sushi and Salad.',
            kind: 'request',
            tip: 'Keep the question short. People read it on a small phone screen.',
          },
        ],
      },
      {
        title: 'Press present',
        text: 'Start the poll. The big screen shows your question and a PIN for people to join with.',
        messages: [
          {
            from: 'host',
            to: 'screen',
            who: 'You',
            name: 'Present',
            info: 'The big screen shows the question and the PIN 4829.',
            kind: 'request',
            tip: 'Share your screen in the meeting so everyone can read the PIN.',
            set: { modes: { screen: 'pin' } },
          },
        ],
      },
      {
        title: 'The audience joins',
        text: 'Everyone opens livepoll.io on their phone and types the PIN. No account, no app.',
        lit: ['pe1', 'pe2', 'pe3'],
        messages: [
          {
            from: 'screen',
            to: ['p1', 'p2', 'p3'],
            who: 'Audience',
            name: 'Enter PIN',
            info: 'Everyone opens livepoll.io and types 4829.',
            kind: 'broadcast',
            tip: 'Paste the address and PIN into the chat for people who join late.',
            set: { modes: { p1: 'pin', p2: 'pin', p3: 'pin' } },
          },
        ],
      },
      {
        title: 'Everyone votes',
        text: 'The question appears on every phone. People tap an option. Each vote counts once.',
        lit: ['pe1', 'pe2'],
        messages: [
          {
            from: 'p1',
            to: 'screen',
            who: 'Maria',
            name: 'Vote: Pizza',
            info: 'Maria taps Pizza.',
            kind: 'request',
            tip: 'People can vote as soon as the question appears.',
            set: { modes: { screen: 'res', p1: 'v', p2: 'q', p3: 'q' }, votes: [1, 0, 0, 0] },
          },
          {
            from: 'p2',
            to: 'screen',
            who: 'Sam',
            name: 'Vote: Tacos',
            info: 'Sam taps Tacos.',
            kind: 'request',
            tip: 'The screen updates without anyone refreshing.',
            set: { modes: { p2: 'v' }, votes: [1, 1, 0, 0] },
          },
        ],
      },
      {
        title: 'Results grow live',
        text: 'Each new vote makes a bar longer on the big screen. Talk through the answers as they come in.',
        lit: ['pe3'],
        messages: [
          {
            from: 'p3',
            to: 'screen',
            who: 'Lee',
            name: 'Vote: Pizza',
            info: 'Lee taps Pizza.',
            kind: 'request',
            tip: 'Wait for the last bar to settle before you move on.',
            set: { modes: { p3: 'v' }, votes: [2, 1, 0, 0] },
          },
          {
            from: 'screen',
            to: 'screen',
            who: 'Everyone',
            name: 'Pizza leads',
            info: 'Pizza is ahead with 2 of 3 votes.',
            kind: 'event',
            tip: 'Ask someone who voted for Tacos to make their case.',
          },
        ],
      },
      {
        title: 'Open the report',
        text: 'When you finish, open the report for totals on every option and the full list of answers.',
        messages: [
          {
            from: 'host',
            to: 'report',
            who: 'You',
            name: 'Open report',
            info: 'See the totals for each option.',
            kind: 'read',
            tip: 'Download the report to share results with people who missed the session.',
          },
        ],
      },
    ],
  };

  window.LP = {
    regions,
    regionIds,
    groups: [
      { title: "How it's built", ids: ['edge', 'session', 'join', 'sockets', 'vote', 'scale', 'reports', 'regions', 'integrations'] },
      { title: 'Using LivePoll', ids: ['use'] },
    ],
    lessons: { edge, session, join, sockets, vote, scale, reports, regions: regionsLesson, integrations, use },
    glossary: [
      ['Presenter', 'The host’s screen. It shows the question and the live results.'],
      ['Audience', 'The people who vote from their phones.'],
      ['Session PIN', 'The short code people type at livepoll.io to join.'],
      ['Socket.IO', 'The library behind LivePoll’s real-time messages. It uses WebSockets.'],
      ['Namespace', 'A named channel on the Socket.IO server. LivePoll has admin and respondent.'],
      ['Room', 'A group of sockets in a namespace. One emit reaches everyone in it.'],
      ['Gateway', 'A WebSocket endpoint in the server. One serves the audience and one serves the presenter.'],
      ['Redis', 'A shared in-memory store. It passes live events between server instances.'],
      ['Region', 'One of five deployments, US, EU, CA, AU or AE, each with its own data.'],
    ],
    jump: [
      ['edge', 'Edge and apps'],
      ['session', 'Start a session'],
      ['join', 'Join with a PIN'],
      ['sockets', 'How WebSockets work'],
      ['vote', 'A live vote'],
      ['scale', 'Scaling with Redis'],
      ['reports', 'Reports'],
      ['regions', 'Regions and data'],
      ['integrations', 'Integrations'],
      ['use', 'Run a live poll'],
    ],
  };
})();

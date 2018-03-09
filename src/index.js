import fs               from 'fs';

import TLSSocket        from './lib/TLSSocket';
import ParsingTools     from './parsingtools';

const SSLOptions = {
  key:  fs.readFileSync('../server-key.pem'),
  cert: fs.readFileSync('../server-crt.pem'),

  requestCert:          false,
  rejectUnauthorized:   false,

  ca: [ fs.readFileSync('../ca-crt.pem') ]
};

const HOST = '0.0.0.0';
const PORT = 5222;

const pt        = new ParsingTools();
const clients   = {};

let user = {
  login: 'asd',
  password: '123'
};

TLSSocket.createServer((sock) => {
  let clientIP = sock.remoteAddress +':'+ sock.remotePort;

  console.log('CONNECTED: ' + clientIP);

  if(!clients[clientIP]) clients[clientIP] = { socket: sock, auth: false };

  let write = (data) => {
    console.log('Server: ' + data);
    sock.write(data);
  };

  let get = (res, child) => {
    console.log('get');
    console.log('child: ' + child.name);
    switch (child.name) {
      case 'ping': {
        let result = pt.create('iq',
          {
            id: res.attr('id')
          }
        );
        write(result.toString());
        break;
      }
      case 'query': {
        switch (child.attr('xmlns')) {
          case 'jabber:iq:register': {
            let result = pt.createIq(
              {
                id: res.attr('id'),
                type: 'result'
              },
              'jabber:iq:register',
              [
                pt.create('username'),
                pt.create('password')
              ]
            );
            write(result);
            break;
          }
          case 'http://jabber.org/protocol/disco#info': {
            let result = pt.create('iq',
              {
                id: res.attr('id'),
                type: 'result',
                from: res.attr('to')
              }
            );
            let query = pt.create('query',
              {
                xmlns: 'http://jabber.org/protocol/disco#info'
              }
            );
            let identity1 = pt.create('identity',
              {
                category: 'conference',
                type: 'text',
                name: 'Play-Specific Chatrooms'
              }
            );
            let identity2 = pt.create('identity',
              {
                category: 'directory',
                type: 'chatroom',
                name: 'Play-Specific Chatrooms'
              }
            );
            let feature1 = pt.create('feature',
              {
                var: 'http://jabber.org/protocol/disco#info'
              }
            );
            let feature2 = pt.create('feature',
              {
                var: 'http://jabber.org/protocol/disco#items'
              }
            );
            let feature3 = pt.create('feature',
              {
                var: 'http://jabber.org/protocol/muc'
              }
            );
            let feature4 = pt.create('feature',
              {
                var: 'jabber:iq:version'
              }
            );
            write(result.t(query.t(feature1).t(identity1).t(identity2).t(feature2).t(feature3).t(feature4)).toString());
            break;
          }
          case 'http://jabber.org/protocol/disco#items': {
            write(`<iq to='${clients[clientIP].jid}' id='${res.attr('id')}' type='result'>
<query xmlns='http://jabber.org/protocol/disco#items'>
<item jid='test.jabber-vk.net'/>
</query>
</iq>`);
            break;
          }
          case 'jabber:iq:private': {
            switch (child.children[0].attr('xmlns')) {
              case 'storage:metacontacts': {
                let result = pt.create('iq',
                  {
                    id: res.attr('id'),
                    type: 'result'
                  }
                );
                let query = pt.create('query',
                  {
                    xmlns: 'jabber:iq:private'
                  }
                );
                let storage = pt.create('storage',
                  {
                    xmlns: 'storage:metacontacts'
                  }
                );
                let contact1 = pt.create('meta',
                  {
                    jid: '123@jabber-vk',
                    tag: 'ae18f2',
                    order: '1'
                  }
                );
                let contact2 = pt.create('meta',
                  {
                    jid: 'test@jabber-vk.com',
                    tag: '82a1a5',
                    order: '1'
                  }
                );
                write(result.t(query.t(storage.t(contact1).t(contact2))).toString());
                break;
              }
              case 'roster:delimiter': {
                let result = pt.create('iq',
                  {
                    id: res.attr('id'),
                    type: 'result'
                  }
                );
                let query = pt.create('query',
                  {
                    xmlns: 'jabber:iq:private'
                  }
                );
                let roster = pt.create('roster',
                  {
                    xmlns: 'roster:delimiter'
                  }
                  ,
                  '::'
                );
                write(result.t(query.t(roster)).toString());
                break;
              }
            }
            break;
          }
          case 'jabber:iq:roster': {
            let result = pt.create('iq',
              {
                type: 'result',
                id: res.attr('id')
              }
            );
            let query = pt.create('query',
              {
                xmlns: 'jabber:iq:roster'
              }
            );
            let item1 = pt.create('item',
              {
                jid: 'mercutio@example.org',
                name: 'Directory of Characters',
                subscription: 'both'
              },
              pt.create('group', null, 'Friends')
            );
            write(result.t(query.t(item1)).toString());
            break;
          }
        }
        break;
      }
    }
  };

  let set = (res, child) => {
    console.log('set');
    console.log('child: ' + child.name);
    switch (child.name) {
      case 'query': {
        switch (child.attr('xmlns')) {
          case 'jabber:iq:register': {
            // TODO registration
            child.children.forEach((elm) => {
              console.log(`${elm.name}: ${elm.text()}`);
            });
            //ERROR
            //let result = pt.createIqError(res.attr('id'), 409, 'Test Error');
            let result = pt.createIq(
              {
                id: res.attr('id'),
                type: 'result'
              }
            );
            write(result);
            break;
          }
        }
        break;
      }
      case 'bind': {
        let result = pt.create('iq',
          {
            id: res.attr('id'),
            type: 'result',
            xmlns: 'jabber:client'
          }
        );
        let bind = pt.create('bind', {
          xmlns: 'urn:ietf:params:xml:ns:xmpp-bind'
        });
        if(!child.children[0] || !child.children[0].children[0]) return console.log('cant bind');
        let jidData = `${clients[clientIP].login}@jabber-vk.com/${child.children[0].children[0]}`;
        clients[clientIP].jid = jidData;
        let jid = pt.create('jid', null, jidData);
        console.log(clients[clientIP].login + ' binded as ' + jidData);
        write(result.t(bind.t(jid)).toString());
        break;
      }
      case 'session': {
        let result = pt.create('iq',
          {
            id: res.attr('id'),
            type: 'result'
          }
        );
        let session = pt.create('session', {
          xmlns: 'urn:ietf:params:xml:ns:xmpp-session'
        });
        write(result.t(session).toString());
        break;
      }
    }
  };

  let message = (res) => {
    console.log('message!');
  };

  sock.on('data', function(data) {
    console.log('Client: ' + data);

    let res = pt.parse(data);

    if(res.name) {
      switch (res.name) {
        case 'starttls': {
          write(`<proceed xmlns="urn:ietf:params:xml:ns:xmpp-tls"/>`);
          console.log('upgrading to TLS');
          sock.upgrade(SSLOptions, function() {
            console.log('upgraded to TLS');
          });
          break;
        }
        case 'auth': {
          if(res.attr('mechanism') == 'PLAIN') {
            if(res.children[0]) {
              let authData = pt.buffSplit(new Buffer(res.children[0], 'base64'), null, true);
              let login = authData[1];
              let password = authData[2];
              console.log('auth: ' + login + '@' + password);
              if(password.toString() == user.password && login.toString() == user.login) {
                console.log('good auth');
                clients[clientIP].login = login.toString();
                clients[clientIP].password = password.toString();
                write(pt.createAuthResponse(true));
              } else {
                console.log('bad auth');
                write(pt.createAuthResponse(false));
              }
            } else {
              console.log('error: ' + res);
            }
          } else {
            //TODO another auth mechanisms
          }
          break;
        }
        case 'iq': {
          switch (res.attr('type')) {
            case 'get': {
              get(res, res.children[0]);
              break;
            }
            case 'set': {
              set(res, res.children[0]);
              break;
            }
          }
          break;
        }
        case 'presence': {
          let result = pt.create('presence');
          if(!res.children[0] || !res.children[0].children[0]) return console.log('cant update presence');
          let priority = pt.create('priority', null, res.children[0].children[0]);
          let show = pt.create('show', null, 'chat');
          let c = pt.create('c',
            {
              xmlns: 'http://jabber.org/protocol/caps',
              node: 'http://gajim.org/caps',
              ext: 'xhtml cstates'
            }
          );
          if(!res.children[4]) return console.log('cant parse presence status');
          let status = pt.create('status', null, res.children[4]);
          let x = pt.create('x',
            {
              xmlns: 'vcard-temp:x:update'
            }
          );
          write(result.t(priority).t(show).t(c).t(status).t(x).toString());
          break;
        }
        case 'message': {
          message(res);
          break;
        }
        default: {
          write(pt.createStream(res));
        }
      }
    } else {
      console.log('Unhandled data: ' + data);
    }

  });

  sock.on('error', function(data) {
    console.log('ERROR: ' + data);
  });

  sock.on('close', function(data) {
    console.log('CLOSED: ' + sock.remoteAddress +' '+ sock.remotePort);
  });

}).listen(PORT, HOST);

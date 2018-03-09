import ltx            from 'ltx';

const Element = ltx.Element;

export default class ParsingTools {
  constructor() {}

  parse = (data) => {
    try {
      if(!data.includes('</stream:stream>'))
        data += '</stream:stream>';
      data = this.checkXMLHeader(data.toString());
      return ltx.parse(data);
    } catch (ex) {
      return data.toString();
    }
  };

  create = (name, data, include) => {
    return new Element(name, data).t(include);
  };

  createIq = (data, xmlns, elms) => {
    let query = this.create('query', { xmlns: xmlns });
    if(elms) elms.forEach((elm) => { query.t(elm); });
    let iq = this.create('iq', data, query);
    return iq.toString();
  };

  createIqError = (id, code, message) => {
    return this.create('iq', { type: 'error', id: id})
      .t(this.create('error', { code: code }, message)).toString();
  };

  createStream = (res) => {
    let stream = this.create('stream:stream',
      Object.assign(res.attrs, {
        'id': this.getNewId(),
        'from': res.attr('to')
      })
    );
    let features = this.create('stream:features');
    let startTls = this.create('starttls', {
      xmlns: 'urn:ietf:params:xml:ns:xmpp-tls'
    });
    let mechanisms = this.create('mechanisms', {
      'xmlns': 'urn:ietf:params:xml:ns:xmpp-sasl'
    });
    //mechanisms.t(this.create('mechanism', null, 'DIGEST-MD5'));
    mechanisms.t(this.create('mechanism', null, 'PLAIN'));
    let bind = this.create('bind', {
      xmlns: 'urn:ietf:params:xml:ns:xmpp-bind'
    });
    let session  = this.create('session', {
      xmlns: 'urn:ietf:params:xml:ns:xmpp-session'
    });
    let auth  = this.create('auth', {
      xmlns: 'http://jabber.org/features/iq-auth'
    });
    stream.t(features.t(startTls).t(mechanisms).t(bind).t(session).t(auth));
    return stream.toString().replace('</stream:stream>', '');
  };

  createAuthResponse(success) {
    /*
     <failure xmlns='urn:ietf:params:xml:ns:xmpp-sasl'>
        <incorrect-encoding/>
     </failure>
     </stream:stream>
     */
    /*
     <success xmlns="urn:ietf:params:xml:ns:xmpp-sasl"/>
     */
    let result = null;
    if(success) {
      result = this.create('success', {
        xmlns: 'urn:ietf:params:xml:ns:xmpp-sasl'
      });
    } else {
      result = this.create('failure', {
        xmlns: 'urn:ietf:params:xml:ns:xmpp-sasl'
      }).t(this.create('incorrect-encoding'));
    }
    return result.toString();
  }

  getNewId() {
    return '4235063168';
  }

  buffSplit(buff, splitBuff) {
    splitBuff = splitBuff || new Buffer.alloc(1);
    let buffData = [];
    let indexOf = -1;
    while((indexOf = buff.indexOf(splitBuff)) > -1) {
      buffData.push(buff.slice(0, indexOf));
      buff = buff.slice(indexOf + splitBuff.length, buff.length);
    }
    buffData.push(buff);
    return buffData;
  }

  // from node-xmpp/streamparser
  checkXMLHeader = (data) => {
    let index = data.indexOf('<?xml');
    if (index !== -1) {
      let end = data.indexOf('?>');
      if (index >= 0 && end >= 0 && index < end + 2) {
        let search = data.substring(index, end + 2);
        data = data.replace(search, '');
      }
    }
    return data;
  };
}

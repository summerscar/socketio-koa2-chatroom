const Koa = require('koa')
const router = require('koa-router')();
const IO = require( 'koa-socket-2' )
const app = new Koa()
const io = new IO()
const logger = require('./log')
const fs = require('fs')
const path = require('path')
const url = require('url');
const {promisify} = require('util')
const userObj = {}
const roomObj ={}

logger.level = 'all';

app.use(async (ctx, next) => {
    const start = new Date()
    await next()
    const ms = new Date() - start
    console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
})

app.use(require('koa-static')(__dirname + '/public'))

/* router.get('/', async (ctx, next) => {
    const readFile = promisify(fs.readFile)
    try {
      let ret = await readFile(__dirname+'/index.html', 'utf8')
      ctx.body = ret;
    } catch (err) {
      console.log(err)
      ctx.throw(500, err)
    }
});

*/
router.get('/:roomid', async (ctx, next) => {
    const readFile = promisify(fs.readFile)
    try {
      let ret = await readFile(__dirname+'/public/room.html', 'utf8')
      ctx.body = ret;
    } catch (err) {
      console.log(err)
      ctx.throw(500, err)
    }
}); 

app.use(router.routes(), router.allowedMethods())


io.attach( app )

io.on('connection', (ctx, data) => {
    let room = url.parse(ctx.socket.request.headers.referer).pathname.substr(1);
    logger.info(`a user connected to room: ${room}`)

    ctx.socket.on('join',(username) => {
        console.log(username)
        ctx.socket.join(room);
        if (!userObj[ctx.socket.id]) {
            userObj[ctx.socket.id] = username
        }
        if (!roomObj[room]) {
            roomObj[room] = []
            roomObj[room].push(ctx.socket.id)
        } else {
            roomObj[room].push(ctx.socket.id)
        }
        io.broadcast( 'message', {user:'系统',content:`欢迎 ${username} 进入房间 ${room} 当前在线人数：${io.connections.size}`} );
        io.to(room).emit( 'message', {user:'系统',content:`欢迎 ${username} 进入了该房间 该房间人数${ roomObj[room].length}`});
    }); 
});

io.on('disconnect',(ctx, data) =>{
    logger.warn(`user: ${userObj[ctx.socket.id]} disconnected`);
    io.broadcast( 'message', {user:'系统',content: `用户 ${userObj[ctx.socket.id]} 下线了`});
    for (let item in roomObj) {
        if (roomObj[item].indexOf(ctx.socket.id) >= -1) {
            roomObj[item].splice(item.indexOf(ctx.socket.id), 1)
        }
    }
    delete userObj[ctx.socket.id]
});

io.on('message', (ctx, data) => {
    let rooms = []
    for (let item in ctx.socket.rooms) {
        rooms.push(item)
    }
    logger.info('receive a message ' + data);
    io.to(rooms[0]).emit( 'message', {user:userObj[ctx.socket.id],content:data});



  
}); 

app.listen(3000);
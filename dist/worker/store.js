importScripts('https://cdnjs.cloudflare.com/ajax/libs/dexie/3.0.1/dexie.min.js');

let db;

let parse = x => JSON.parse(x);

const awaitTillReady = ()=> {
    return new Promise(resolve => {
        let i = setInterval(()=>{

            if(db && db.transaction){
                clearInterval(i);
                i = null
                resolve(true)
            }
        },250)

    })
}

async function init  (cb) {
    let dbVersion = 3;
    db = new Dexie("clusterplan");
    db.version(dbVersion).stores({Events: '&id,start,end,[start+end],year'})
}

async function  add(key,data,store) {


    if(!db || !db.transaction){
        await awaitTillReady()
    }

    db[store].put(data);
}

const get = ({
    Events:async (store='Events')=>{
       await awaitTillReady()

       return  db[store].toArray()

    },
    EventBetweenDates:async (start,end,store='Events')=> {
       return  db[store].where(['start','end'])
            .between(
                [
                    start,
                    start
                ],
                [
                    end,
                    end
                ]
                , true, true)
            .toArray()
    }
});


self.onmessage = function(event) {
    switch (event.data.action) {
        case "init"  : {
            return init();
        }
        case "load"  : {
            return get.EventBetweenDates(event.data.start,event.data.end).then(events => self.postMessage({pId:event.data.pId, name: 'loaded', events: events, initial: event.data.initial}))
        }
        case "save"  :{
            for(let i = 0;i<event.data.data.length;i++){
                event.data.data[i].start = new Date(event.data.data[i].start);
                event.data.data[i].end   = new Date(event.data.data[i].end  );
                add(event.data.data[i].id,event.data.data[i] ,'Events');
            }
            break
        }
    }
}

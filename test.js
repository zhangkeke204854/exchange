
// import fetch from "node-fetch";
// import { HttpsProxyAgent } from "https-proxy-agent";


// const agent = new HttpsProxyAgent('http://127.0.0.1:7890');

// fetch('https://fapi.binance.com/fapi/v1/time', { agent })
// .then((response) => response.text())
// .then((text) => console.log(text))
// .catch((error) => console.error(error));

// import requestSync from "request";
// import requestProxy from "request";

// // const requestProxy = require("request").defaults({proxy: "http://127.0.0.1:7890", rejectUnauthorized: false});


// function synchronous_post (url, params) {
//     let options = {
//         url: url,
//         form: params
//     };

//     return new Promise(function (resolve, reject) {
//         requestProxy.get(options, function (error, response, body) {
//             if (error) {
//                 reject(error);
//             } else {
//                 resolve(body);
//             }
//         });
//     });
// }


// let syncBody = async function (url) {
//     // let url = "http://www.baidu.com/";
//     var url = url;
//     let body = await synchronous_post(url);
//     // console.log('##### BBBBB', body);
//     return JSON.parse(body);
// }

// let url = "https://fapi.binance.com/fapi/v1/time";
// var body = syncBody(url);	//函数外部使用

// console.log(body);

// // 在其他函数内部使用
// async function funcName(url){
// 	var body = await syncBody(url);
// 	console.log(body);
// }



// import {exchanges} from 'ccxt'
// console.log (exchanges)
// console.log (typeof exchanges)


function countDecimalPlaces(number) {
    // 使用条件判断来判断值是否为空
    if (number === null || number === undefined || number === '') {
        return null; // 如果值为空，则返回 null
    }

    // 将数字转换为字符串
    var strNumber = Number(number).toString();
    console.log(strNumber)
    // 使用正则表达式查找小数点后的数字数量
    const match = strNumber.match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
    console.log(match)
    if (!match) {
        // 如果没有匹配到小数点，则返回 0
        return 0;
    }

    // // 获取小数点后的数字
    // const decimalPart = match[1];
    // if (!decimalPart) {
    //     // 如果小数点后没有数字，则返回 0
    //     return 0;
    // }

    // 返回小数点后数字的长度，即小数点的位数
    // return decimalPart.length;
}


function convertToNumber(value) {
    // 使用条件判断来判断值是否为空
    if (value === null || value === undefined || value === '') {
        return null; // 如果值为空，则返回 null
    }

    // 使用 Number() 函数将值转换为数字
    const numberValue = Number(value);

    // 检查是否成功转换为数字
    if (isNaN(numberValue)) {
        return null; // 如果转换失败，则返回 null
    }

    return numberValue; // 如果转换成功，则返回数字值
}


var a = 0.00001e-1
countDecimalPlaces(a);







// if (strNumber.includes('e-')) {
//     strNumber = strNumber.replace('e-', 'e');
//     var strNumberList = strNumber.split('e');
//      // 使用正则表达式查找小数点后的数字数量
//     const match = strNumberList[0].match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
//     if (!match) {
//         // 如果没有匹配到小数点，则返回 0
//         return 0;
//     }

// }
// else if (strNumber.includes('e') || strNumber.includes('e+')) {
//     strNumber = strNumber.replace('e+', 'e');
//     var strNumberList = strNumber.split('e');
//      // 使用正则表达式查找小数点后的数字数量
//     const match = strNumberList[0].match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);

    
// }
// else {

// }

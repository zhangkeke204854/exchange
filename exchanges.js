function threadFetch(className, task, fd, count, multiple, proxy) {
    function countDecimalPlaces(number) {
        if (number === null || number === undefined || number === '' || Number(number) === null || Number(number).toString() === 'NaN') {
            return null // 如果值为空则返回 null
        }
        let stringNumber = number.toString(); // 将数字转换为字符串
        if (!stringNumber.includes('e')) {
            if (stringNumber.includes('.')) {
                return stringNumber.split('.')[1].replace(/0+$/, '').length
            }
            else {
                return 0
            }
        }
        else {
            let matchObject = stringNumber.match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/); // 使用正则表达式查找小数点后的数字数量
            let input = matchObject['input']
            if (input === null || input === undefined || input === 'NaN') {
                return null // 如果值为空则返回 null
            }
            let decimalLength = null;
            let scienceNumber = null;
            let decimalPart = matchObject[1]; // 获取小数点后的数字
            if (decimalPart !== undefined) {
                decimalLength = decimalPart.length;
            }
            let sciencePart = matchObject[2]; // 获取科学计算数字
            if (sciencePart !== undefined) {
                scienceNumber = Number(sciencePart);
            }
            if (decimalLength !== null && scienceNumber !== null) {
                if (decimalLength > scienceNumber) {
                    return decimalLength - scienceNumber
                }
                else {
                    return 0
                }
            }
            else if (decimalLength !== null && scienceNumber === null) {
                return decimalLength
            }

            else if (decimalLength === null && scienceNumber !== null) {
                return Math.abs(scienceNumber)
            }
            else {
                return 0
            }
        }
    }

    function convertToNumber(value) {
        if (value === null || value === undefined || value === '') {
            return null // 如果值为空则返回 null
        }
        let valueString = String(value).replace(/, /g, ''); // 使用正则表达式匹配数字

        let numberValue = Number(valueString); // 使用 Number() 函数将值转换为数字
        if (isNaN(numberValue)) {
            return null // 如果转换失败则返回 null
        }
        return numberValue // 如果转换成功则返回数字值
    }

    function getTimestamp(interval = '1m') {
        let now = new Date();
        now.setSeconds(0, 0); // 将秒和毫秒设置为零
        if (interval === '15m') {
            now.setMinutes(Math.floor(now.getMinutes() / 15) * 15); // 将分钟设置为前一个15分钟的倍数
        }
        else if (interval === '1d'){
            now.setHours(0, 0); // 设置时间为当天凌晨
        }
        else if (interval === 'funding'){
            now.setMinutes(0); // 设置时间为前小时
        }
        return now.getTime()
    }

    function getIsoString(timestamp) {
        if (timestamp === null || timestamp === undefined || timestamp === '' || timestamp === 0) {
            return null // 如果值为空则返回 null
        }
        if (typeof timestamp === "string") {
            timestamp = convertToNumber(timestamp);
        }
        if (String(timestamp).length !== 10 && String(timestamp).length !== 13) {
            return null // 不符合时间戳格式则返回 null
        }
        if (String(timestamp).length === 10) {
            timestamp = timestamp * 1000;
        }

        let date = new Date(timestamp); // 将时间戳转换为 Date 对象
        let isoString = date.toISOString(); // 获取ISO8601格式的UTC时间
        return isoString
    }

    function getCstString(timestamp) {
        if (timestamp === null || timestamp === undefined || timestamp === '' || timestamp === 0) {
            return null // 如果值为空则返回 null
        }
        if (typeof timestamp === "string") {
            timestamp = convertToNumber(timestamp);
        }
        if (String(timestamp).length !== 10 && String(timestamp).length !== 13) {
            return null // 不符合时间戳格式则返回 null
        }
        if (String(timestamp).length === 10) {
            timestamp = timestamp * 1000;
        }

        const date = new Date(timestamp); // 将时间戳转换为 Date 对象
        const cstOffset = 8 * 60; // 将时间转换为 CST (UTC+8)
        const cstDate = new Date(date.getTime() + cstOffset * 60 * 1000);
        const year = cstDate.getUTCFullYear();
        const month = String(cstDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(cstDate.getUTCDate()).padStart(2, '0');
        const hours = String(cstDate.getUTCHours()).padStart(2, '0');
        const minutes = String(cstDate.getUTCMinutes()).padStart(2, '0');
        const seconds = String(cstDate.getUTCSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    let deferSleepMs = 0;
    function deferSleep(sleep) {
        deferSleepMs = sleep;
    }

    let lastRequet = 0;
    let showUrl = null;
    let showResponse = null;
    function jsonFetch(url, options = {}) {
        if (proxy) {
            options.proxy = proxy;
        }
        if (typeof (options.timeout) !== 'number') {
            options.timeout = 20000 // default timeout is 2 seconds
        }
        let startRequet = new Date().getTime();
        let timestamp = deferSleepMs - (startRequet - lastRequet);
        if (timestamp > 0) {
            Sleep(timestamp);
        }
        try {
            lastRequet = new Date().getTime();
            let response = HttpQuery(url, options);
            showUrl = url;
            showResponse = response;
            count.http_query += 1;
            if (!response) {
                count.http_error += 1;
            } 
            else if (typeof response == 'string') {
                count.total_bytes += response.length;
            }

            __threadSetData(__threadId(), 'Status', { className: className, count: count, last: _D(), url: url, task: task });

            if (typeof response == 'string') {
                return JSON.parse(response)
            }
            else {
                return response
            }
        }
        catch (error) {
            return null
        }
    }

    function parseData(klineArray, begin, interval = '1d') {
        if (Array.isArray(klineArray)) {
            let dataLength = klineArray.length;
            if (dataLength === 0) {
                if (typeof begin === 'number') {
                    if (begin >= getTimestamp('1d')) {
                        return true
                    }
                    else {
                    return begin + 86400000
                    }
                }
                else {
                    return true
                }     
            }
            else if (dataLength === 1) {
                let klineBegin = klineArray[0][1];
                if (interval === '1m') {
                    let difference = getTimestamp(interval) - klineBegin;
                    if (difference < 60000 * 10) {
                        return true
                    }
                    else {
                    if (typeof begin === 'number') {
                            return begin + 60000
                        }
                        else {
                            return klineBegin + 60000
                        }
                    }
                }
                else if (interval === '15m') {
                    let difference = getTimestamp(interval) - klineBegin;
                    if (difference < 900000 * 4) {
                        return true
                    }
                    else {
                    if (typeof begin === 'number') {
                            return begin + 900000
                        }
                        else {
                            return klineBegin + 900000
                        }
                    }
                }
                else {
                    let difference = getTimestamp('1d') - klineBegin;
                    if (difference < 86400000 * 2) {
                        return true
                    }
                    else {
                        if (typeof begin === 'number') {
                            return begin + 86400000
                        }
                        else {
                            return klineBegin + 86400000
                        }
                    }
                }
            }
            else {
                return true
            }
        }
        else {
            return true
        }
    }

    function createrKline(sourceKlinesArray, klineType) {
        if (klineType !== '15m' && klineType !== '1d') {
            return sourceKlinesArray
        }
        let minutesObject = {};
        let nowKline = null;
        for (let i = 0; i < sourceKlinesArray.length; i++) {
            let timestamp = sourceKlinesArray[i][1];
            let date = new Date(timestamp);
            if (klineType === '15m') {
                let minutes = date.getUTCMinutes();
                if (minutes === 0 || minutes === 15 || minutes === 30 || minutes === 45) {
                    nowKline = timestamp;
                    minutesObject[nowKline] = [];
                    minutesObject[nowKline].push(sourceKlinesArray[i]);
                }
                else if (nowKline !== null && nowKline in minutesObject && timestamp - nowKline < 900000) {
                    minutesObject[nowKline].push(sourceKlinesArray[i]);
                }
            }
            else {
                let hours = date.getUTCHours();
                if (hours === 0) {
                    nowKline = timestamp;
                    minutesObject[nowKline] = [];
                    minutesObject[nowKline].push(sourceKlinesArray[i]);
                }
                else if (nowKline !== null && nowKline in minutesObject && timestamp - nowKline < 86400000) {
                    minutesObject[nowKline].push(sourceKlinesArray[i]);
                }
            }
        }

        let klineArray = [];
        for (let nowKline in minutesObject) {
            let itemArray = minutesObject[nowKline];
            if (itemArray.length <= 0) {
                continue;
            }
            let _symbol = itemArray[0][0];
            let open = itemArray[0][2];
            let highArray = [];
            let lowArray = [];
            let volume = 0;
            for (let i = 0; i < itemArray.length; i++) {
                let item = itemArray[i];
                highArray.push(item[3]);
                lowArray.push(item[4]);
                volume += convertToNumber(item[6]);
            }
            let high = Math.max(...highArray);
            let low = Math.min(...lowArray);
            let close = itemArray.slice(-1)[0][5];
            klineArray.push([_symbol, convertToNumber(nowKline), open, high, low, close, volume])
        }
        if (klineArray.length > 0) {
            klineArray.pop();
        }
        return klineArray
    }

    // 注册类
    class ClassRegistry {
        constructor() {
            this.classes = new Map();
        }

        // 注册类的方法
        register(className, classDefinition, isRun = null, isTickers = null) {
            if (typeof classDefinition !== 'function') {
                throw new Error('classDefinition must be a constructor function');
            }

            let methods = this.getClassMethods(classDefinition); // 获取类的方法

            let properties = this.getClassProperties(classDefinition); // 获取类的属性

            // 将类名方法和属性存储到Map中
            this.classes.set(className, { className: className, classDefinition: classDefinition, methods: methods, properties: properties, isRun: isRun, isTickers: isTickers });
        }

        // 获取类的方法
        getClassMethods(classDefinition) {
            let methods_list = ['getMarketsSpot', 'getMarketsSwap', 'getMarketsFuture', 'getTickersSpot', 'getTickersSwap', 'getTickersFuture',
                'fetchKlinesSpot', 'fetchKlinesSwap', 'fetchKlinesFuture', 'fetchKlinesIndex', 'fetchKlinesFunding'];
            return Object.getOwnPropertyNames(classDefinition.prototype)
                .filter(prop => prop !== 'constructor' && typeof classDefinition.prototype[prop] === 'function' && methods_list.includes(prop))
        }

        // 获取类的属性值
        getClassProperties(classDefinition) {
            let instance = new classDefinition();
            return Object.values(instance)
        }

        // 返回所有类名方法和属性
        getAllClasses() {
            let result = [];
            for (let [className, info] of this.classes.entries()) {
                result.push(info);
            }
            return result
        }
    }

    // Binance
    class Binance {
        constructor() {
            this.spot_markets_url = "https://api.binance.com/api/v3/exchangeInfo";
            this.swap_markets_urls = [
                "https://fapi.binance.com/fapi/v1/exchangeInfo",
                "https://dapi.binance.com/dapi/v1/exchangeInfo"
            ];
            this.future_markets_urls = [
                "https://fapi.binance.com/fapi/v1/exchangeInfo",
                "https://dapi.binance.com/dapi/v1/exchangeInfo"
            ];
            this.spot_tickers_url = "https://api.binance.com/api/v3/ticker/24hr"
            this.swap_tickers_urls = [
                "https://fapi.binance.com/fapi/v1/ticker/24hr",
                "https://dapi.binance.com/dapi/v1/ticker/24hr"
            ];
            this.future_tickers_urls = [
                "https://fapi.binance.com/fapi/v1/ticker/24hr",
                "https://dapi.binance.com/dapi/v1/ticker/24hr"
            ];
            this.spot_klines_url = "https://api.binance.com/api/v3/klines";
            this.u_swap_klines_url = "https://fapi.binance.com/fapi/v1/klines";
            this.b_swap_klines_url = "https://dapi.binance.com/dapi/v1/klines";
            this.u_future_klines_url = "https://fapi.binance.com/fapi/v1/continuousKlines";
            this.b_future_klines_url = "https://dapi.binance.com/dapi/v1/continuousKlines";
            this.u_index_url = "https://fapi.binance.com/fapi/v1/indexPriceKlines";
            this.b_index_url = "https://dapi.binance.com/dapi/v1/indexPriceKlines";
            this.u_funding_url = "https://fapi.binance.com/fapi/v1/fundingRate";
            this.b_funding_url = "https://dapi.binance.com/dapi/v1/fundingRate";
        }

        parseMarketsData(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["symbols"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if ('status' in item) {
                    if (item['status'] !== 'TRADING') {
                        continue;
                    }
                }
                else if ('contractStatus' in item) {
                    if (item['contractStatus'] !== 'TRADING') {
                        continue;
                    }
                }
                let Symbol = null;
                let Contract = null;
                let TickSize = null;
                let AmountSize = null;
                let PricePrecision = null;
                let AmountPrecision = null;
                let MinQty = null;
                let MaxQty = null;
                let MinNotional = null;
                let MaxNotional = null;
                let CtVal = null;
                let CtValCcy = null;
                let BaseAsset = String(item["baseAsset"]).toLowerCase();
                let QuoteAsset = String(item["quoteAsset"]).toLowerCase();
                let contractType = item['contractType'];
                if (symbolType === 'spot') {
                    Symbol = BaseAsset + '_' + QuoteAsset;
                }
                else if (symbolType === 'swap') {
                    if (contractType === '' || contractType === null) {
                        continue;
                    }
                    else if (contractType !== "PERPETUAL") {
                        continue;
                    }
                    Contract = 'swap';
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                    if (QuoteAsset === 'usd') {
                        CtVal = convertToNumber(item['contractSize']);
                        CtValCcy = QuoteAsset;
                    }
                    else if (QuoteAsset === 'usdt' || QuoteAsset === 'usdc' || QuoteAsset === 'btc') {
                        CtVal = 1;
                        CtValCcy = BaseAsset;
                    }
                }
                else {
                    if (contractType === '' || contractType === null) {
                        continue;
                    }
                    else if (!["CURRENT_MONTH", "NEXT_MONTH", "CURRENT_QUARTER", "NEXT_QUARTER"].includes(contractType)) {
                        continue;
                    }
                    if (contractType === 'CURRENT_MONTH') {
                        Contract = 'this_month';
                    }
                    else if (contractType === 'CURRENT_QUARTER') {
                        Contract = 'this_quarter';
                    }
                    else {
                        Contract = contractType.toLowerCase();
                    }
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                    if (QuoteAsset === 'usd') {
                        CtVal = convertToNumber(item['contractSize']);
                        CtValCcy = QuoteAsset;
                    }
                    else if (QuoteAsset === 'usdt' || QuoteAsset === 'usdc' || QuoteAsset === 'btc') {
                        CtVal = 1;
                        CtValCcy = BaseAsset;
                    }
                }
                let filters = item['filters'];
                for (let j = 0; j < filters.length; j++) {
                    let temp_item = filters[j];
                    let filter_type = temp_item['filterType'];
                    if (filter_type == "PRICE_FILTER") {
                        TickSize = convertToNumber(temp_item['tickSize']);
                        PricePrecision = countDecimalPlaces(temp_item['tickSize']);
                    }
                    else if (filter_type == "LOT_SIZE") {
                        AmountSize = convertToNumber(temp_item['stepSize']);
                        AmountPrecision = countDecimalPlaces(temp_item['stepSize']);
                        MinQty = convertToNumber(temp_item['minQty']);
                        MaxQty = convertToNumber(temp_item['maxQty']);
                    }
                    else if (filter_type == "NOTIONAL") {
                        MinNotional = convertToNumber(temp_item['minNotional']);
                        MaxNotional = convertToNumber(temp_item['maxNotional']);
                    }
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: Contract,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: TickSize,
                    AmountSize: AmountSize,
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: MinQty,
                    MaxQty: MaxQty,
                    MinNotional: MinNotional,
                    MaxNotional: MaxNotional,
                    CtVal: CtVal,
                    CtValCcy: CtValCcy,
                    Info: item
                };
            }
        }

        parseTickersData(response, symbolObject, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let _symbol = String(item['symbol']);
                if (!(_symbol in symbolObject)) {
                    continue;
                }
                let Symbol = symbolObject[_symbol];
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: _symbol,
                    High: convertToNumber(item["highPrice"]),
                    Low: convertToNumber(item["lowPrice"]),
                    Sell: convertToNumber(item["askPrice"]),
                    Buy: convertToNumber(item["bidPrice"]),
                    Last: convertToNumber(item["lastPrice"]),
                    Open: convertToNumber(item["openPrice"]),
                    Volume: convertToNumber(item["volume"]),
                    QuoteVolume: convertToNumber(item["quoteVolume"]),
                    Time: convertToNumber(item["closeTime"]),
                    Info: item
                };
            }
        }

        parseKlinesData1(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1000) {
                    limit = 1000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = '1m';
            }
            else if (interval === '15m') {
                _interval = '15m';
            }
            else {
                _interval = '1d';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&interval=${_interval}&limit=${limit}`;
            }
            else {
                url = `${base_url}?symbol=${alias}&interval=${_interval}&limit=${limit}&startTime=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesData2(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1000) {
                    limit = 1000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let contractType = _symbol.split('.')[1];
            if (contractType === 'this_quarter') {
                contractType = 'CURRENT_QUARTER';
            }
            else if (contractType === 'next_quarter') {
                contractType = 'NEXT_QUARTER';
            }
            else if (contractType === 'this_month') {
                contractType = 'CURRENT_MONTH';
            }
            else if (contractType === 'next_month') {
                contractType = 'NEXT_MONTH';
            }

            let pair = alias.split('_')[0];

            let _interval = null;
            if (interval === '1m') {
                _interval = '1m';
            }
            else if (interval === '15m') {
                _interval = '15m';
            }
            else {
                _interval = '1d';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?contractType=${contractType}&pair=${pair}&interval=${_interval}&limit=${limit}`;
            }
            else {
                url = `${base_url}?contractType=${contractType}&pair=${pair}&interval=${_interval}&limit=${limit}&startTime=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesIndexData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1500) {
                    limit = 1500;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = '1m';
            }
            else if (interval === '15m') {
                _interval = '15m';
            }
            else {
                _interval = '1d';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?pair=${alias}&interval=${_interval}&limit=${limit}`;
            }
            else {
                url = `${base_url}?pair=${alias}&interval=${_interval}&limit=${limit}&startTime=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), 0]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesFundingData(base_url, _symbol, alias, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1000) {
                    limit = 1000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&limit=${limit}`;
            }
            else {
                url = `${base_url}?symbol=${alias}&limit=${limit}&startTime=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(item['fundingTime']), convertToNumber(item['fundingRate'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, 'spot', newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            this.swap_markets_urls.map(url => {
                let response = jsonFetch(url);
                this.parseMarketsData(response, 'swap', newDataObject);
            });
            return newDataObject
        }

        // Markets FUTURES(交割合约)
        getMarketsFuture() {
            let newDataObject = {};
            this.future_markets_urls.map(url => {
                let response = jsonFetch(url);
                this.parseMarketsData(response, 'future', newDataObject);
            });
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let symbolObject = {};
            let markets_response = jsonFetch(this.spot_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            let dataArray = markets_response["symbols"];
            if (!Array.isArray(dataArray)) {
                return newDataObject
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item['status'] !== 'TRADING') {
                    continue;
                }
                let BaseAsset = String(item["baseAsset"]).toLowerCase();
                let QuoteAsset = String(item["quoteAsset"]).toLowerCase();
                let _symbol = String(item['symbol']);
                symbolObject[_symbol] = BaseAsset + '_' + QuoteAsset;
            }
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, symbolObject, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let symbolObject = {};
            this.swap_markets_urls.map(url => {
                let markets_response = jsonFetch(url);
                if (markets_response === null) {
                    return newDataObject
                }
                let dataArray = markets_response["symbols"];
                if (!Array.isArray(dataArray)) {
                    return newDataObject
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    if ('status' in item) {
                        if (item['status'] !== 'TRADING') {
                            continue;
                        }
                    }
                    else if ('contractStatus' in item) {
                        if (item['contractStatus'] !== 'TRADING') {
                            continue;
                        }
                    }
                    let contractType = item['contractType'];
                    if (contractType === '' || contractType === null) {
                        continue;
                    }
                    if (contractType !== "PERPETUAL") {
                        continue;
                    }
                    let BaseAsset = String(item["baseAsset"]).toLowerCase();
                    let QuoteAsset = String(item["quoteAsset"]).toLowerCase();
                    let _symbol = String(item['symbol']);
                    symbolObject[_symbol] = BaseAsset + '_' + QuoteAsset + '.swap';
                }
            });
            this.swap_tickers_urls.map(url => {
                let response = jsonFetch(url);
                this.parseTickersData(response, symbolObject, newDataObject);
            });
            return newDataObject
        }

        // Tickers FUTURES(交割合约)
        getTickersFuture() {
            let newDataObject = {};
            let symbolObject = {};
            this.future_markets_urls.map(url => {
                let markets_response = jsonFetch(url);
                if (markets_response === null) {
                    return newDataObject
                }
                let dataArray = markets_response["symbols"];
                if (!Array.isArray(dataArray)) {
                    return newDataObject
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    if ('status' in item) {
                        if (item['status'] !== 'TRADING') {
                            continue;
                        }
                    }
                    else if ('contractStatus' in item) {
                        if (item['contractStatus'] !== 'TRADING') {
                            continue;
                        }
                    }
                    let contractType = item['contractType'];
                    if (contractType === '' || contractType === null) {
                        continue;
                    }
                    else if (!["CURRENT_MONTH", "NEXT_MONTH", "CURRENT_QUARTER", "NEXT_QUARTER"].includes(contractType)) {
                        continue;
                    }

                    let Contract = null;
                    if (contractType === 'CURRENT_MONTH') {
                        Contract = 'this_month';
                    }
                    else if (contractType === 'CURRENT_QUARTER') {
                        Contract = 'this_quarter';
                    }
                    else {
                        Contract = contractType.toLowerCase();
                    }
                    let BaseAsset = String(item["baseAsset"]).toLowerCase();
                    let QuoteAsset = String(item["quoteAsset"]).toLowerCase();
                    let _symbol = String(item['symbol']);
                    symbolObject[_symbol] = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                }
            });
            this.swap_tickers_urls.map(url => {
                let response = jsonFetch(url);
                this.parseTickersData(response, symbolObject, newDataObject);
            });
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 20, _symbol, alias, interval = '1d', begin = 1501516800000, limit = 1000) {
            while (true) {
                let klineArray = this.parseKlinesData1(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 125, _symbol, alias, interval = '1d', begin = 1567267200000, limit = 1000) {
            let swap_klines_url = null;
            if (alias.includes('_') && alias.split('_')[0].slice(-3) === 'USD') {
                swap_klines_url = this.b_swap_klines_url;
                if (interval == '1d') {
                    limit = 200; // startTime 与 endTime 之间最多只可以相差200天
                }
            }
            else {
                swap_klines_url = this.u_swap_klines_url;
            }
            while (true) {
                let klineArray = this.parseKlinesData1(swap_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(交割合约)
        fetchKlinesFuture(sleep = 125, _symbol, alias, interval = '1d', begin = 1567267200000, limit = 1000) {
            let future_klines_url = null;
            if (alias.includes('_') && alias.split('_')[0].slice(-3) === 'USD') {
                future_klines_url = this.b_future_klines_url;
                if (interval == '1d') {
                    limit = 200; // startTime 与 endTime 之间最多只可以相差200天
                }
            }
            else {
                future_klines_url = this.u_future_klines_url;
            }
            while (true) {
                let klineArray = this.parseKlinesData2(future_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(价格指数)
        fetchKlinesIndex(sleep = 125, _symbol, alias, interval = '1d', begin = 1575129600000, limit = 1000) {
            let index_url = null;
            if (alias.includes('_') && alias.split('_')[0].slice(-3) === 'USD') {
                index_url = this.b_index_url;
                alias = alias.split('_')[0];
                if (interval == '1d') {
                    limit = 200; // startTime 与 endTime 之间最多只可以相差200天
                }
            }
            else {
                index_url = this.u_index_url;
            }
            while (true) {
                let klineArray = this.parseKlinesIndexData(index_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(资金费率)
        fetchKlinesFunding(sleep = 700, _symbol, alias, begin = 1567267200000, limit = 1000) {
            let funding_url = null;
            if (alias.includes('_') && alias.split('_')[0].slice(-3) === 'USD') {
                funding_url = this.b_funding_url;
            }
            else {
                funding_url = this.u_funding_url;
            }
            while (true) {
                let klineArray = this.parseKlinesFundingData(funding_url, _symbol, alias, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // Coinbase
    class Coinbase {
        constructor() {
            this.spot_markets_url = "https://api.exchange.coinbase.com/products";
            this.spot_tickers_url = "https://api.exchange.coinbase.com/products";
            this.spot_klines_url = "https://api.exchange.coinbase.com/products";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let trading_disabled = item['trading_disabled'];
                if (trading_disabled === true) {
                    continue;
                }
                let BaseAsset = String(item['base_currency']).toLowerCase();
                let QuoteAsset = String(item['quote_currency']).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['id']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item["quote_increment"]),
                    AmountSize: convertToNumber(item["base_increment"]),
                    PricePrecision: countDecimalPlaces(item["quote_increment"]),
                    AmountPrecision: countDecimalPlaces(item["base_increment"]),
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, _symbol, newDataObject) {
            if (response === null) {
                return
            }
            if (Object.prototype.toString.call(response) !== '[object Object]') {
                return
            }
            try {
                let Symbol = String(_symbol).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(_symbol),
                    High: null,
                    Low: null,
                    Sell: convertToNumber(response["ask"]),
                    Buy: convertToNumber(response["bid"]),
                    Last: convertToNumber(response["price"]),
                    Open: null,
                    Volume: convertToNumber(response["volume"]),
                    QuoteVolume: null,
                    Time: convertToNumber(Date.parse(response["time"])),
                    Info: response
                };
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name}  Method: parseTickersData  Symbol: ${_symbol}`, String(error));
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }

            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 300) {
                    limit = 300;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }

            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = 60;
                endBegin = begin + (limit - 1) * 60;
            }
            else if (interval === '15m') {
                _interval = 900;
                endBegin = begin + (limit - 1) * 900;
            }
            else {
                _interval = 86400;
                endBegin = begin + (limit - 1) * 86400;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}/${alias}/candles?granularity=${_interval}`;
            }
            else {
                let date_now = Math.floor(Date.now() / 1000);
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}/${alias}/candles?granularity=${_interval}&start=${begin}&end=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                response.reverse();
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(item[0]) * 1000, convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let markets_response = jsonFetch(this.spot_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            if (!Array.isArray(markets_response)) {
                return newDataObject
            }
            for (let i = 0; i < markets_response.length; i++) {
                let item = markets_response[i];
                if (item['trading_disabled'] === true) {
                    continue;
                }
                let response = jsonFetch(this.spot_tickers_url + "/" + item['id'] + "/ticker");
                this.parseTickersData(response, item['id'], newDataObject);
                Sleep(50);
            }
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 50, _symbol, alias, interval = '1d', begin = 1435680000000, limit = 300) {
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // OKX
    class OKX {
        constructor() {
            this.spot_markets_url = "https://www.okx.com/api/v5/public/instruments?instType=";
            this.swap_markets_url = "https://www.okx.com/api/v5/public/instruments?instType=";
            this.future_markets_url = "https://www.okx.com/api/v5/public/instruments?instType=";
            this.spot_tickers_url = "https://www.okx.com/api/v5/market/tickers?instType=";
            this.swap_tickers_url = "https://www.okx.com/api/v5/market/tickers?instType=";
            this.future_tickers_url = "https://www.okx.com/api/v5/market/tickers?instType=";
            this.spot_klines_url = "https://www.okx.com/api/v5/market/history-candles";
            this.swap_klines_url = "https://www.okx.com/api/v5/market/history-candles";
            this.future_klines_url = "https://www.okx.com/api/v5/market/history-candles";
            this.index_url = "https://www.okx.com/api/v5/market/history-index-candles";
            this.funding_url = "https://www.okx.com/api/v5/public/funding-rate-history";
        }

        parseMarketsData(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item['state'] !== 'live') {
                    continue;
                }
                let _symbol = String(item['instId']).replace(/-/g, '_').toLowerCase();
                let Symbol = null;
                let Contract = null;
                let BaseAsset = null;
                let QuoteAsset = null;
                let CtVal = null;
                let CtValCcy = null;
                if (symbolType === 'spot') {
                    BaseAsset = _symbol.split('_')[0];
                    QuoteAsset = _symbol.split('_')[1];
                    Symbol = BaseAsset + '_' + QuoteAsset;
                }
                else if (symbolType === 'swap') {
                    BaseAsset = _symbol.split('_')[0];
                    QuoteAsset = _symbol.split('_')[1];
                    Contract = 'swap';
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                    CtVal = convertToNumber(item["ctVal"]);
                    CtValCcy = item["ctValCcy"];
                }
                else {
                    BaseAsset = _symbol.split('_')[0];
                    QuoteAsset = _symbol.split('_')[1];
                    Contract = item["alias"];
                    if (Contract === 'quarter') {
                        Contract = 'this_quarter';
                    }
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                    CtVal = convertToNumber(item["ctVal"]);
                    CtValCcy = item["ctValCcy"];
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['instId']),
                    Contract: Contract,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item["tickSz"]),
                    AmountSize: convertToNumber(item["lotSz"]),
                    PricePrecision: countDecimalPlaces(item["tickSz"]),
                    AmountPrecision: countDecimalPlaces(item["lotSz"]),
                    MinQty: convertToNumber(item["minSz"]),
                    MaxQty: convertToNumber(item["maxMktSz"]),
                    MinNotional: null,
                    MaxNotional: convertToNumber(item["maxMktAmt"]),
                    CtVal: CtVal,
                    CtValCcy: CtValCcy,
                    Info: item
                };
            }
        }

        parseTickersData1(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let _symbol = String(item["instId"]).replace(/-/g, '_').toLowerCase();
                let Symbol = null;
                if (symbolType === 'spot') {
                    Symbol = _symbol;
                }
                else {
                    Symbol = _symbol.split('_')[0] + '_' + _symbol.split('_')[1] + '.swap';
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['instId']),
                    High: convertToNumber(item["high24h"]),
                    Low: convertToNumber(item["low24h"]),
                    Sell: convertToNumber(item["askPx"]),
                    Buy: convertToNumber(item["bidPx"]),
                    Last: convertToNumber(item["last"]),
                    Open: convertToNumber(item["open24h"]),
                    Volume: convertToNumber(item["vol24h"]),
                    QuoteVolume: convertToNumber(item["volCcy24h"]),
                    Time: convertToNumber(item["ts"]),
                    Info: item
                };
            }
        }

        parseTickersData2(response, symbolObject, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let _symbol = String(item['instId']).replace(/-/g, '_').toLowerCase();
                if (!(_symbol in symbolObject)) {
                    continue;
                }
                let Symbol = symbolObject[_symbol];
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: _symbol,
                    High: convertToNumber(item["high24h"]),
                    Low: convertToNumber(item["low24h"]),
                    Sell: convertToNumber(item["askPx"]),
                    Buy: convertToNumber(item["bidPx"]),
                    Last: convertToNumber(item["last"]),
                    Open: convertToNumber(item["open24h"]),
                    Volume: convertToNumber(item["vol24h"]),
                    QuoteVolume: convertToNumber(item["volCcy24h"]),
                    Time: convertToNumber(item["ts"]),
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 100) {
                    limit = 100;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = '1m';
            }
            else if (interval === '15m') {
                _interval = '15m';
            }
            else {
                _interval = '1D';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?instId=${alias}&bar=${_interval}&limit=${limit}`;
            }
            else {
                if (interval === '1m') {
                    begin += 60000;
                }
                else if (interval === '15m') {
                    begin += 900000;
                }
                else {
                    begin += 86400000;
                }
                url = `${base_url}?instId=${alias}&bar=${_interval}&limit=${limit}&after=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                dataArray.reverse();
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesIndexData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 100) {
                    limit = 100;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            alias = alias.split('-')[0] + '-' + alias.split('-')[1];
            let _interval = null;
            if (interval === '1m') {
                _interval = '1m';
            }
            else if (interval === '15m') {
                _interval = '15m';
            }
            else {
                _interval = '1D';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?instId=${alias}&bar=${_interval}&limit=${limit}`;
            }
            else {
                if (interval === '1m') {
                    begin += 60000;
                }
                else if (interval === '15m') {
                    begin += 900000;
                }
                else {
                    begin += 86400000;
                }
                url = `${base_url}?instId=${alias}&bar=${_interval}&limit=${limit}&after=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                dataArray.reverse();
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), 0]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesFundingData(base_url, _symbol, alias, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 100) {
                    limit = 100;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?instId=${alias}&limit=${limit}`;
            }
            else {
                begin += 3600000;
                url = `${base_url}?instId=${alias}&limit=${limit}&after=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                dataArray.reverse();
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['fundingTime']), convertToNumber(item['realizedRate'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url + "SPOT");
            this.parseMarketsData(response, 'spot', newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url + "SWAP");
            this.parseMarketsData(response, 'swap', newDataObject);
            return newDataObject
        }

        // Markets FUTURES(交割合约)
        getMarketsFuture() {
            let newDataObject = {};
            let response = jsonFetch(this.future_markets_url + "FUTURES");
            this.parseMarketsData(response, 'future', newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url + "SPOT");
            this.parseTickersData1(response, 'spot', newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_tickers_url + "SWAP");
            this.parseTickersData1(response, 'swap', newDataObject);
            return newDataObject
        }

        // Tickers FUTURES(交割合约)
        getTickersFuture() {
            let newDataObject = {};
            let symbolObject = {};
            let markets_response = jsonFetch(this.future_markets_url + "FUTURES");
            if (markets_response === null) {
                return newDataObject
            }
            let dataArray = markets_response["data"];
            if (!Array.isArray(dataArray)) {
                return newDataObject
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Contract = item["alias"];
                if (Contract === 'quarter') {
                    Contract = 'this_quarter';
                }
                let _symbol = String(item['instId']).replace(/-/g, '_').toLowerCase();
                symbolObject[_symbol] = _symbol.split('_')[0] + '_' + _symbol.split('_')[1] + '.' + Contract;
            }
            let response = jsonFetch(this.future_tickers_url + "FUTURES");
            this.parseTickersData2(response, symbolObject, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 100, _symbol, alias, interval = '1d', begin = null, limit = 100) {
            let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 100, _symbol, alias, interval = '1d', begin = null, limit = 100) {
            let klineArray = this.parseKlinesData(this.swap_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(交割合约)
        fetchKlinesFuture(sleep = 100, _symbol, alias, interval = '1d', begin = null, limit = 100) {
            let klineArray = this.parseKlinesData(this.future_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(价格指数)
        fetchKlinesIndex(sleep = 200, _symbol, alias, interval = '1d', begin = null, limit = 100) {
            let klineArray = this.parseKlinesIndexData(this.index_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(资金费率)
        fetchKlinesFunding(sleep = 200, _symbol, alias, begin = null, limit = 100) {
            let klineArray = this.parseKlinesFundingData(this.funding_url, _symbol, alias, begin, limit);
            deferSleep(sleep);
            return klineArray
        }
    }

    // Bybit
    class Bybit {
        constructor() {
            this.spot_markets_url = "https://api.bybit.com/v5/market/instruments-info?category=spot";
            this.swap_markets_urls = [
                "https://api.bybit.com/v5/market/instruments-info?category=linear",
                "https://api.bybit.com/v5/market/instruments-info?category=inverse"
            ];
            this.future_markets_urls = [
                "https://api.bybit.com/v5/market/instruments-info?category=linear",
                "https://api.bybit.com/v5/market/instruments-info?category=inverse"
            ];
            this.spot_tickers_url = "https://api.bybit.com/v5/market/tickers?category=spot";
            this.swap_tickers_urls = [
                "https://api.bybit.com/v5/market/tickers?category=linear",
                "https://api.bybit.com/v5/market/tickers?category=inverse"
            ];
            this.future_tickers_urls = [
                "https://api.bybit.com/v5/market/tickers?category=linear",
                "https://api.bybit.com/v5/market/tickers?category=inverse"
            ];

            this.klines_url = "https://api.bybit.com/v5/market/kline?category=";
            this.index_url = "https://api.bybit.com/v5/market/index-price-kline?category=";
            this.funding_url = "https://api.bybit.com/v5/market/funding/history?category=";
            this.monthsObject = {
                'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
                'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
            };

        }

        parseMarketsData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["result"]["list"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item['status'] !== 'Trading') {
                    continue;
                }
                let BaseAsset = String(item['baseCoin']).toLowerCase();
                let QuoteAsset = String(item['quoteCoin']).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item["priceFilter"]["tickSize"]),
                    AmountSize: convertToNumber(item["lotSizeFilter"]["basePrecision"]),
                    PricePrecision: countDecimalPlaces(item["priceFilter"]["tickSize"]),
                    AmountPrecision: countDecimalPlaces(item["lotSizeFilter"]["basePrecision"]),
                    MinQty: convertToNumber(item["lotSizeFilter"]["minOrderQty"]),
                    MaxQty: convertToNumber(item["lotSizeFilter"]["maxOrderQty"]),
                    MinNotional: convertToNumber(item["lotSizeFilter"]["minOrderAmt"]),
                    MaxNotional: convertToNumber(item["lotSizeFilter"]["maxOrderAmt"]),
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseMarketsData2(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["result"]["list"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item['status'] !== 'Trading') {
                    continue;
                }
                if (item['contractType'] === 'LinearFutures' || item['contractType'] === 'InverseFutures') {
                    continue;
                }
                let BaseAsset = String(item['baseCoin']).toLowerCase();
                let QuoteAsset = String(item['quoteCoin']).toLowerCase();
                let CtVal = null;
                let CtValCcy = null;
                if (QuoteAsset === 'usd') {
                    CtVal = 1;
                    CtValCcy = QuoteAsset;
                }
                else if (QuoteAsset === 'usdt' || QuoteAsset === 'usdc') {
                    CtVal = 1;
                    CtValCcy = BaseAsset;
                }
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: 'swap',
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item["priceFilter"]["tickSize"]),
                    AmountSize: convertToNumber(item["lotSizeFilter"]["qtyStep"]),
                    PricePrecision: countDecimalPlaces(item["priceFilter"]["tickSize"]),
                    AmountPrecision: countDecimalPlaces(item["lotSizeFilter"]["qtyStep"]),
                    MinQty: convertToNumber(item["lotSizeFilter"]["minOrderQty"]),
                    MaxQty: convertToNumber(item["lotSizeFilter"]["maxOrderQty"]),
                    MinNotional: convertToNumber(item["lotSizeFilter"]["minNotionalValue"]),
                    MaxNotional: null,
                    CtVal: CtVal,
                    CtValCcy: CtValCcy,
                    Info: item
                };
            }
        }

        parseMarketsData3(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["result"]["list"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item['status'] !== 'Trading') {
                    continue;
                }
                if (item['contractType'] === 'LinearPerpetual' || item['contractType'] === 'InversePerpetual') {
                    continue;
                }
                let _symbol = String(item['symbol']);
                let Contract = '';
                for (let months in this.monthsObject) {
                    if (_symbol.includes(months) && _symbol.includes('-')) {
                        let symbolList = _symbol.split('-');
                        let dateList = symbolList[1].split(months);
                        Contract = '20' + dateList[1] + this.monthsObject[months] + dateList[0];
                    }
                }
                if (Contract === null) {
                    Contract = _symbol.slice(-3).toLowerCase();
                }
                let BaseAsset = String(item['baseCoin']).toLowerCase();
                let QuoteAsset = String(item['quoteCoin']).toLowerCase();
                let CtVal = null;
                let CtValCcy = null;
                if (QuoteAsset === 'usd') {
                    CtVal = 1;
                    CtValCcy = QuoteAsset;
                }
                else if (QuoteAsset === 'usdt' || QuoteAsset === 'usdc') {
                    CtVal = 1;
                    CtValCcy = BaseAsset;
                }
                let Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: Contract,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item["priceFilter"]["tickSize"]),
                    AmountSize: convertToNumber(item["lotSizeFilter"]["qtyStep"]),
                    PricePrecision: countDecimalPlaces(item["priceFilter"]["tickSize"]),
                    AmountPrecision: countDecimalPlaces(item["lotSizeFilter"]["qtyStep"]),
                    MinQty: convertToNumber(item["lotSizeFilter"]["minOrderQty"]),
                    MaxQty: convertToNumber(item["lotSizeFilter"]["maxOrderQty"]),
                    MinNotional: convertToNumber(item["lotSizeFilter"]["minNotionalValue"]),
                    MaxNotional: null,
                    CtVal: CtVal,
                    CtValCcy: CtValCcy,
                    Info: item
                };
            }
        }

        parseTickersData(response, symbolObject, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["result"]["list"];
            if (!Array.isArray(dataArray)) {
                return
            }
            let Time = response["time"];
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let _symbol = String(item['symbol']);
                if (!(_symbol in symbolObject)) {
                    continue;
                }
                let Symbol = symbolObject[_symbol];
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: _symbol,
                    High: convertToNumber(item["highPrice24h"]),
                    Low: convertToNumber(item["lowPrice24h"]),
                    Sell: convertToNumber(item["ask1Price"]),
                    Buy: convertToNumber(item["bid1Price"]),
                    Last: convertToNumber(item["lastPrice"]),
                    Open: convertToNumber(item["prevPrice24h"]),
                    Volume: convertToNumber(item["volume24h"]),
                    QuoteVolume: convertToNumber(item["turnover24h"]),
                    Time: Time,
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1000) {
                    limit = 1000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = 1;
            }
            else if (interval === '15m') {
                _interval = 15;
            }
            else {
                _interval = 'D';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}&symbol=${alias}&interval=${_interval}&limit=${limit}`;
            }
            else {
                url = `${base_url}&symbol=${alias}&interval=${_interval}&limit=${limit}&end=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let result = response['result'];
                if (Object.prototype.toString.call(result) !== '[object Object]') {
                    return 
                }
                let dataArray = result['list'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                dataArray.reverse();
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesIndexData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1000) {
                    limit = 1000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }

            let _interval = null;
            if (interval === '1m') {
                _interval = 1;
            }
            else if (interval === '15m') {
                _interval = 15;
            }
            else {
                _interval = 'D';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}&symbol=${alias}&interval=${_interval}&limit=${limit}`;
            }
            else {
                url = `${base_url}&symbol=${alias}&interval=${_interval}&limit=${limit}&end=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let result = response['result'];
                if (Object.prototype.toString.call(result) !== '[object Object]') {
                    return 
                }
                let dataArray = result['list'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                dataArray.reverse();
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), 0]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesFundingData(base_url, _symbol, alias, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 200) {
                    limit = 200;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}&symbol=${alias}&limit=${limit}`;
            }
            else {
                url = `${base_url}&symbol=${alias}&limit=${limit}&endTime=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let result = response['result'];
                if (Object.prototype.toString.call(result) !== '[object Object]') {
                    return 
                }
                let dataArray = result['list'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                dataArray.reverse();
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['fundingRateTimestamp']), convertToNumber(item['fundingRate'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData1(response, newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            this.swap_markets_urls.map(url => {
                let response = jsonFetch(url);
                this.parseMarketsData2(response, newDataObject);
            });
            return newDataObject
        }

        // Markets FUTURES(交割合约)
        getMarketsFuture() {
            let newDataObject = {};
            this.future_markets_urls.map(url => {
                let response = jsonFetch(url);
                this.parseMarketsData3(response, newDataObject);
            });
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let symbolObject = {};
            let markets_response = jsonFetch(this.spot_markets_url);
            if (markets_response === null) {
                return
            }
            let dataArray = markets_response["result"]["list"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item['status'] !== 'Trading') {
                    continue;
                }
                let BaseAsset = String(item['baseCoin']).toLowerCase();
                let QuoteAsset = String(item['quoteCoin']).toLowerCase();
                let _symbol = String(item['symbol']);
                symbolObject[_symbol] = BaseAsset + '_' + QuoteAsset;
            }
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, symbolObject, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let symbolObject = {};
            this.swap_markets_urls.map(url => {
                let markets_response = jsonFetch(url);
                if (markets_response === null) {
                    return newDataObject
                }
                let dataArray = markets_response["result"]["list"];
                if (!Array.isArray(dataArray)) {
                    return newDataObject
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    if (item['status'] !== 'Trading') {
                        continue;
                    }
                    if (item['contractType'] === 'LinearFutures' || item['contractType'] === 'InverseFutures') {
                        continue;
                    }
                    let BaseAsset = String(item['baseCoin']).toLowerCase();
                    let QuoteAsset = String(item['quoteCoin']).toLowerCase();
                    let _symbol = String(item['symbol']);
                    symbolObject[_symbol] = BaseAsset + '_' + QuoteAsset + '.swap';
                }
            });
            this.swap_tickers_urls.map(url => {
                let response = jsonFetch(url);
                this.parseTickersData(response, symbolObject, newDataObject);
            });
            return newDataObject
        }

        // Tickers FUTURES(交割合约)
        getTickersFuture() {
            let newDataObject = {};
            let symbolObject = {};
            this.future_markets_urls.map(url => {
                let markets_response = jsonFetch(url);
                if (markets_response === null) {
                    return newDataObject
                }
                let dataArray = markets_response["result"]["list"];
                if (!Array.isArray(dataArray)) {
                    return newDataObject
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    if (item['status'] !== 'Trading') {
                        continue;
                    }
                    if (item['contractType'] === 'LinearPerpetual' || item['contractType'] === 'InversePerpetual') {
                        continue;
                    }
                    let _symbol = String(item['symbol']);
                    let Contract = '';
                    for (let months in this.monthsObject) {
                        if (_symbol.includes(months) && _symbol.includes('-')) {
                            let symbolList = _symbol.split('-');
                            let dateList = symbolList[1].split(months);
                            Contract = '20' + dateList[1] + this.monthsObject[months] + dateList[0];
                        }
                    }
                    let BaseAsset = String(item['baseCoin']).toLowerCase();
                    let QuoteAsset = String(item['quoteCoin']).toLowerCase();
                    if (Contract === null) {
                        Contract = _symbol.slice(-3).toLowerCase()
                    }
                    symbolObject[_symbol] = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                }
            });
            this.future_tickers_urls.map(url => {
                let response = jsonFetch(url);
                this.parseTickersData(response, symbolObject, newDataObject);
            });
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 100, _symbol, alias, interval = '1d', begin = null, limit = 1000) {
            let spot_klines_url = this.klines_url + "spot";
            let klineArray = this.parseKlinesData(spot_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 100, _symbol, alias, interval = '1d', begin = null, limit = 1000) {
            let swap_klines_url = null;
            if (alias.slice(-3) === 'USD') {
                swap_klines_url = this.klines_url + "inverse";
            }
            else {
                swap_klines_url = this.klines_url + "linear";
            }
            let klineArray = this.parseKlinesData(swap_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(交割合约)
        fetchKlinesFuture(sleep = 100, _symbol, alias, interval = '1d', begin = null, limit = 1000) {
            let future_klines_url = null;
            if (alias.includes('-')) {
                future_klines_url = this.klines_url + "linear";
            }
            else {
                future_klines_url = this.klines_url + "inverse";
            }
            let klineArray = this.parseKlinesData(future_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(价格指数)
        fetchKlinesIndex(sleep = 200, _symbol, alias, interval = '1d', begin = null, limit = 1000) {
            let index_url = null;
            if (alias.slice(-3) === 'USD') {
                index_url = this.index_url + "inverse";
            }
            else {
                index_url = this.index_url + "linear";
            }
            let klineArray = this.parseKlinesIndexData(index_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(资金费率)
        fetchKlinesFunding(sleep = 200, _symbol, alias, begin = null, limit = 200) {
            let funding_url = null;
            if (alias.slice(-3) === 'USD') {
                funding_url = this.funding_url + "inverse";
            }
            else {
                funding_url = this.funding_url + "linear";
            }
            let klineArray = this.parseKlinesFundingData(funding_url, _symbol, alias, begin, limit);
            deferSleep(sleep);
            return klineArray
        }
    }

    // Upbit
    class Upbit {
        constructor() {
            this.spot_markets_url = "https://api.upbit.com/v1/market/all";
            this.spot_tickers_url = "https://api.upbit.com/v1/ticker?markets=";
            this.spot_klines_url = "https://api.upbit.com/v1/candles";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let market = String(item['market']).replace(/-/g, '_').toLowerCase();
                let BaseAsset = market.split('_')[1];
                let QuoteAsset = market.split('_')[0];
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['market']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: null,
                    AmountSize: null,
                    PricePrecision: null,
                    AmountPrecision: null,
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let market = String(item['market']).replace(/-/g, '_').toLowerCase();
                let BaseAsset = market.split('_')[1];
                let QuoteAsset = market.split('_')[0];
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['market']),
                    High: convertToNumber(item["high_price"]),
                    Low: convertToNumber(item["low_price"]),
                    Sell: null,
                    Buy: null,
                    Last: convertToNumber(item["trade_price"]),
                    Open: convertToNumber(item["opening_price"]),
                    Volume: convertToNumber(item["acc_trade_volume_24h"]),
                    QuoteVolume: convertToNumber(item["acc_trade_price_24h"]),
                    Time: convertToNumber(item["timestamp"]),
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 200) {
                    limit = 200;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = 'minutes/1';
            }
            else if (interval === '15m') {
                _interval = 'minutes/15';
            }
            else {
                _interval = 'days';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}/${_interval}?market=${alias}&count=${limit}`;
            }
            else {
                let date = new Date(begin); // 创建 Date 对象
                let year = date.getFullYear();
                let month = String(date.getMonth() + 1).padStart(2, '0');
                let day = String(date.getDate()).padStart(2, '0');
                let hours = String(date.getHours()).padStart(2, '0');
                let minutes = String(date.getMinutes()).padStart(2, '0');
                let seconds = String(date.getSeconds()).padStart(2, '0');
                let toBegin = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
                url = `${base_url}/${_interval}?market=${alias}&count=${limit}&to=${toBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                response.reverse();
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(Date.parse(item['candle_date_time_utc']) + 8 * 3600 * 1000), convertToNumber(item['opening_price']),
                        convertToNumber(item['high_price']), convertToNumber(item['low_price']), convertToNumber(item['trade_price']),
                        convertToNumber(item['candle_acc_trade_volume'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let spot_response = jsonFetch(this.spot_markets_url);
            if (spot_response === null) {
                return
            }
            if (!Array.isArray(spot_response)) {
                return newDataObject
            }
            let symbolArray = [];
            for (let i = 0; i < spot_response.length; i++) {
                let item = spot_response[i];
                symbolArray.push(item["market"]);
            }
            let result = symbolArray.join(',');
            let response = jsonFetch(this.spot_tickers_url + result);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 100, _symbol, alias, interval = '1d', begin = null, limit = 200) {
            let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }
    }

    // Kraken
    class Kraken {
        constructor() {
            this.spot_markets_url = "https://api.kraken.com/0/public/AssetPairs";
            this.swap_markets_url = "https://futures.kraken.com/derivatives/api/v3/instruments";
            this.future_markets_url = "https://futures.kraken.com/derivatives/api/v3/instruments";
            this.spot_tickers_url = "https://api.kraken.com/0/public/Ticker";
            this.swap_tickers_url = "https://futures.kraken.com/derivatives/api/v3/tickers";
            this.future_tickers_url = "https://futures.kraken.com/derivatives/api/v3/tickers";
            this.spot_klines_url = "https://api.kraken.com/0/public/OHLC";
            this.swap_klines_url = "https://futures.kraken.com/api/charts/v1/trade";
            this.future_klines_url = "https://futures.kraken.com/api/charts/v1/trade";
            this.funding_url = "https://futures.kraken.com/derivatives/api/v4/historicalfundingrates";
        }

        parseMarketsData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataObject = response["result"];
            if (Object.prototype.toString.call(dataObject) !== '[object Object]') {
                return
            }
            for (let _symbol in dataObject) {
                let item = dataObject[_symbol];
                let status = item["status"];
                if (status !== 'online') {
                    continue;
                }
                let BaseAsset = String(item["base"]).toLowerCase();
                let QuoteAsset = String(item["quote"]).toLowerCase();
                let AmountPrecision = convertToNumber(item["lot_decimals"]);
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(_symbol),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item["tick_size"]),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: countDecimalPlaces(item["tick_size"]),
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item["ordermin"]),
                    MaxQty: null,
                    MinNotional: convertToNumber(item["costmin"]),
                    MaxNotional: null,
                    CtVal: convertToNumber(item["ctVal"]),
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseMarketsData2(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["instruments"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item['type'] !== 'flexible_futures' && item['type'] !== 'futures_inverse') {
                    continue;
                }
                let tradeable = item["tradeable"];
                if (tradeable !== true) {
                    continue;
                }
                let Symbol = null;
                let Contract = null;
                let CtValCcy = null;
                let AmountSize = null
                let _symbol = String(item['symbol']).replace(/-/g, '_').toLowerCase();
                let symbol_list = _symbol.split('_');
                let QuoteAsset = 'usd';
                let BaseAsset = symbol_list[1].replace(QuoteAsset, '');
                if (symbolType === 'swap') {
                    if (symbol_list[0] !== 'pf' && symbol_list[0] !== 'pi') {
                        continue;
                    }
                    Contract = 'swap';
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                }
                else {
                    if (symbol_list[0] !== 'ff' && symbol_list[0] !== 'fi') {
                        continue;
                    }
                    Contract = symbol_list[2];
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                }
                if (symbol_list[0] === 'fi' || symbol_list[0] === 'pi') {
                    CtValCcy = QuoteAsset;;
                }
                else if (symbol_list[0] === 'pf' || symbol_list[0] === 'ff') {
                    CtValCcy = BaseAsset;;
                }
                let AmountPrecision = convertToNumber(item["contractValueTradePrecision"]);
                if (AmountPrecision < 0) {
                    AmountSize = convertToNumber(Math.pow(10, Math.abs(AmountPrecision)));
                }
                else {
                    AmountSize = convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision));
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: Contract,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item["tickSize"]),
                    AmountSize: AmountSize,
                    PricePrecision: countDecimalPlaces(item["tickSize"]),
                    AmountPrecision: AmountPrecision,
                    MinQty: null,
                    MaxQty: convertToNumber(item["maxPositionSize"]),
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: convertToNumber(item["contractSize"]),
                    CtValCcy: CtValCcy,
                    Info: item
                };
            }
        }

        parseTickersData1(response, symbolObject, newDataObject) {
            if (response === null) {
                return
            }
            let dataObject = response["result"];
            if (Object.prototype.toString.call(dataObject) !== '[object Object]') {
                return
            }
            for (let _symbol in dataObject) {
                if (!(_symbol in symbolObject)) {
                    continue;
                }
                let item = dataObject[_symbol];
                let Symbol = symbolObject[_symbol];
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(_symbol),
                    High: convertToNumber(item["h"][1]),
                    Low: convertToNumber(item["l"][1]),
                    Sell: convertToNumber(item["a"][0]),
                    Buy: convertToNumber(item["b"][0]),
                    Last: convertToNumber(item["c"][0]),
                    Open: convertToNumber(item["o"]),
                    Volume: convertToNumber(item["v"][1]),
                    QuoteVolume: null,
                    Time: null,
                    Info: item
                };
            }
        }

        parseTickersData2(response, symbolObject, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["tickers"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let _symbol = String(item['symbol']).replace(/-/g, '_').toLowerCase();
                if (!(_symbol in symbolObject)) {
                    continue;
                }
                let Symbol = symbolObject[_symbol];
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    High: null,
                    Low: null,
                    Sell: convertToNumber(item["ask"]),
                    Buy: convertToNumber(item["bid"]),
                    Last: convertToNumber(item["last"]),
                    Open: convertToNumber(item["open24h"]),
                    Volume: convertToNumber(item["vol24h"]),
                    QuoteVolume: null,
                    Time: convertToNumber(Date.parse(item["lastTime"])),
                    Info: item
                };
            }
        }

        parseKlinesData1(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }

            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 720) {
                    limit = 720;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = 1;
            }
            else if (interval === '15m') {
                _interval = 15;
            }
            else {
                _interval = 1440;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?pair=${alias}&interval=${_interval}`;
            }
            else {
                if (interval === '1m') {
                    begin -= 60;
                }
                else if (interval === '15m') {
                    begin -= 900;
                }
                else {
                    begin -= 86400;
                }
                url = `${base_url}?pair=${alias}&interval=${_interval}&since=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['result'][alias];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item[0]) * 1000, convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[6])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesData2(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }

            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1000) {
                    limit = 1000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = '1m';
            }
            else if (interval === '15m') {
                _interval = '15m';
            }
            else {
                _interval = '1d';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}/${alias}/${_interval}`;
            }
            else {
                url = `${base_url}/${alias}/${_interval}?to=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['candles'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['time']), convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['volume'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesFundingData(base_url, _symbol, alias, begin, limit) {
            let url = `${base_url}?symbol=${alias}`;
            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response["rates"];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    let timestamp = new Date(item['timestamp']).getTime();
                    klineArray.push([_symbol, convertToNumber(timestamp), convertToNumber(item['fundingRate'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData1(response, newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData2(response, 'swap', newDataObject);
            return newDataObject
        }

        // Markets FUTURES(交割合约)
        getMarketsFuture() {
            let newDataObject = {};
            let response = jsonFetch(this.future_markets_url);
            this.parseMarketsData2(response, 'future', newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let symbolObject = {};
            let markets_response = jsonFetch(this.spot_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            let dataObject = markets_response["result"];
            if (Object.prototype.toString.call(dataObject) !== '[object Object]') {
                return newDataObject
            }
            for (let _symbol in dataObject) {
                let item = dataObject[_symbol];
                let status = item["status"];
                if (status !== 'online') {
                    continue;
                }
                let BaseAsset = String(item["base"]).toLowerCase();
                let QuoteAsset = String(item["quote"]).toLowerCase();
                symbolObject[_symbol] = BaseAsset + '_' + QuoteAsset;
            }
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData1(response, symbolObject, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let symbolObject = {};
            let markets_response = jsonFetch(this.swap_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            let dataArray = markets_response["instruments"];
            if (!Array.isArray(dataArray)) {
                return newDataObject
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item['type'] !== 'flexible_futures' && item['type'] !== 'futures_inverse') {
                    continue;
                }
                let tradeable = item["tradeable"];
                if (tradeable !== true) {
                    continue;
                }
                let _symbol = String(item['symbol']).replace(/-/g, '_').toLowerCase();
                let symbol_list = _symbol.split('_');
                let QuoteAsset = 'usd';
                let BaseAsset = symbol_list[1].replace(QuoteAsset, '');
                if (symbol_list[0] !== 'pf' && symbol_list[0] !== 'pi') {
                    continue;
                }
                symbolObject[_symbol] = BaseAsset + '_' + QuoteAsset + '.swap';
            }
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData2(response, symbolObject, newDataObject);
            return newDataObject
        }

        // Tickers FUTURES(交割合约)
        getTickersFuture() {
            let newDataObject = {};
            let symbolObject = {};
            let markets_response = jsonFetch(this.future_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            let dataArray = markets_response["instruments"];
            if (!Array.isArray(dataArray)) {
                return newDataObject
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item['type'] !== 'flexible_futures' && item['type'] !== 'futures_inverse') {
                    continue;
                }
                let tradeable = item["tradeable"];
                if (tradeable !== true) {
                    continue;
                }
                let _symbol = String(item['symbol']).replace(/-/g, '_').toLowerCase();
                let symbol_list = _symbol.split('_');
                let QuoteAsset = 'usd';
                let BaseAsset = symbol_list[1].replace(QuoteAsset, '');
                if (symbol_list[0] !== 'ff' && symbol_list[0] !== 'fi') {
                    continue;
                }
                symbolObject[_symbol] = BaseAsset + '_' + QuoteAsset + '.' + symbol_list[2];
            }
            let response = jsonFetch(this.future_tickers_url);
            this.parseTickersData2(response, symbolObject, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 100, _symbol, alias, interval = '1d', begin = null, limit = 720) {
            let klineArray = this.parseKlinesData1(this.spot_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 100, _symbol, alias, interval = '1d', begin = null, limit = 1000) {
            let klineArray = this.parseKlinesData2(this.swap_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(交割合约)
        fetchKlinesFuture(sleep = 100, _symbol, alias, interval = '1d', begin = null, limit = 1000) {
            let klineArray = this.parseKlinesData2(this.future_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(资金费率)
        fetchKlinesFunding(sleep = 100, _symbol, alias, begin = null, limit = null) {
            let klineArray = this.parseKlinesFundingData(this.funding_url, _symbol, alias, begin, limit);
            deferSleep(sleep);
            return klineArray
        }
    }

    // KuCoin
    class KuCoin {
        constructor() {
            this.spot_markets_url = "https://api.kucoin.com/api/v2/symbols";
            this.swap_markets_url = "https://api-futures.kucoin.com/api/v1/contracts/active";
            this.spot_tickers_url = "https://api.kucoin.com/api/v1/market/allTickers";
            this.swap_tickers_url = "https://api-futures.kucoin.com/api/v1/contracts/active";
            this.spot_klines_url = "https://api.kucoin.com/api/v1/market/candles";
            this.swap_klines_url = "https://api-futures.kucoin.com/api/v1/kline/query";
        }

        parseMarketsData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let enableTrading = item['enableTrading'];
                if (enableTrading !== true) {
                    continue;
                }
                let BaseAsset = String(item['baseCurrency']).toLowerCase();
                let QuoteAsset = String(item['quoteCurrency']).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item["priceIncrement"]),
                    AmountSize: convertToNumber(item["baseIncrement"]),
                    PricePrecision: countDecimalPlaces(item["priceIncrement"]),
                    AmountPrecision: countDecimalPlaces(item["baseIncrement"]),
                    MinQty: convertToNumber(item["baseMinSize"]),
                    MaxQty: convertToNumber(item["baseMaxSize"]),
                    MinNotional: convertToNumber(item["quoteMinSize"]),
                    MaxNotional: convertToNumber(item["quoteMaxSize"]),
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseMarketsData2(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = String(item['baseCurrency']).toLowerCase();
                let QuoteAsset = String(item['quoteCurrency']).toLowerCase();
                let CtVal = null;
                let CtValCcy = null;
                if (QuoteAsset === 'usd') {
                    CtVal = 1;
                    CtValCcy = QuoteAsset;
                }
                else if (QuoteAsset === 'usdt' || QuoteAsset === 'usdc') {
                    CtVal = convertToNumber(item["multiplier"]);
                    CtValCcy = BaseAsset;
                }
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: 'swap',
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item["tickSize"]),
                    AmountSize: convertToNumber(item["lotSize"]),
                    PricePrecision: countDecimalPlaces(item["tickSize"]),
                    AmountPrecision: countDecimalPlaces(item["lotSize"]),
                    MinQty: null,
                    MaxQty: convertToNumber(item["maxOrderQty"]),
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: CtVal,
                    CtValCcy: CtValCcy,
                    Info: item
                };
            }
        }

        parseTickersData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"]["ticker"];
            if (!Array.isArray(dataArray)) {
                return
            }
            let Time = response["data"]["time"];
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Last = convertToNumber(item["last"]);
                let changePrice = convertToNumber(item["changePrice"]);
                let Open = convertToNumber((Last - changePrice).toFixed(countDecimalPlaces(Last)));
                let High = convertToNumber(item["high"]);
                let Low = convertToNumber(item["low"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                let Symbol = String(item['symbol']).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    High: High,
                    Low: Low,
                    Sell: convertToNumber(item["sell"]),
                    Buy: convertToNumber(item["buy"]),
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["vol"]),
                    QuoteVolume: convertToNumber(item["volValue"]),
                    Time: Time,
                    Info: item
                };
            }
        }

        parseTickersData2(response, symbolObject, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let _symbol = String(item['symbol']);
                if (!(_symbol in symbolObject)) {
                    continue;
                }
                let Symbol = symbolObject[_symbol];
                let Last = convertToNumber(item["lastTradePrice"]);
                let changePrice = convertToNumber(item["priceChg"]);
                let Open = convertToNumber((Last - changePrice).toFixed(countDecimalPlaces(Last)));
                let High = convertToNumber(item["highPrice"]);
                let Low = convertToNumber(item["lowPrice"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: _symbol,
                    High: High,
                    Low: Low,
                    Sell: null,
                    Buy: null,
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["volumeOf24h"]),
                    QuoteVolume: convertToNumber(item["turnoverOf24h"]),
                    Time: null,
                    Info: item
                };
            }
        }

        parseKlinesData1(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1500) {
                    limit = 1500;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = '1min';
            }
            else if (interval === '15m') {
                _interval = '15min';
            }
            else {
                _interval = '1day';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&type=${_interval}`;
            }
            else {
                url = `${base_url}?symbol=${alias}&type=${_interval}&startAt=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                dataArray.reverse();
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item[0]) * 1000, convertToNumber(item[1]), convertToNumber(item[3]),
                        convertToNumber(item[4]), convertToNumber(item[2]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesData2(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 200) {
                    limit = 200;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = 1;
            }
            else if (interval === '15m') {
                _interval = 15;
            }
            else {
                _interval = 1440;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&granularity=${_interval}`;
            }
            else {
                if (interval === '1m') {
                    begin -= 60000;
                }
                else if (interval === '15m') {
                    begin -= 900000;
                }
                else {
                    begin -= 86400000;
                }
                url = `${base_url}?symbol=${alias}&granularity=${_interval}&from=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData1(response, newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData2(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData1(response, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let symbolObject = {};
            let markets_response = jsonFetch(this.swap_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            let dataArray = markets_response["data"];
            if (!Array.isArray(dataArray)) {
                return newDataObject
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = String(item['baseCurrency']).toLowerCase();
                let QuoteAsset = String(item['quoteCurrency']).toLowerCase();
                let _symbol = String(item['symbol']);
                symbolObject[_symbol] = BaseAsset + '_' + QuoteAsset + '.swap';
            }
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData2(response, symbolObject, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 25, _symbol, alias, interval = '1d', begin = 1506787200000, limit = 1500) {
            while (true) {
                let klineArray = this.parseKlinesData1(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 50, _symbol, alias, interval = '1d', begin = 1590940800000, limit = 200) {
            while (true) {
                let klineArray = this.parseKlinesData2(this.swap_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // GateIO
    class GateIO {
        constructor() {
            this.spot_markets_url = "https://api.gateio.ws/api/v4/spot/currency_pairs";
            this.swap_markets_urls = [
                "https://api.gateio.ws/api/v4/futures/usdt/contracts",
                "https://api.gateio.ws/api/v4/futures/btc/contracts"
            ];
            this.future_markets_url = "https://api.gateio.ws/api/v4/delivery/usdt/contracts";
            this.spot_tickers_url = "https://api.gateio.ws/api/v4/spot/tickers"
            this.swap_tickers_urls = [
                "https://api.gateio.ws/api/v4/futures/usdt/tickers",
                "https://api.gateio.ws/api/v4/futures/btc/tickers"
            ];
            this.futures_tickerss_url = "https://api.gateio.ws/api/v4/delivery/usdt/tickers";
            this.spot_klines_url = "https://api.gateio.ws/api/v4/spot/candlesticks";
            this.swap_klines_url = "https://api.gateio.ws/api/v4/futures";
            this.future_klines_url = "https://api.gateio.ws/api/v4/delivery";
            this.index_url = "https://api.gateio.ws/api/v4/futures";
            this.funding_url = "https://api.gateio.ws/api/v4/futures";
        }

        parseMarketsData1(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                if (item['trade_status'] === 'untradable') {
                    continue;
                }
                let TickSize = null;
                let AmountSize = null;
                let PricePrecision = convertToNumber(item["precision"]);
                if (PricePrecision < 0) {
                    TickSize = convertToNumber(Math.pow(10, Math.abs(PricePrecision)));
                }
                else {
                    TickSize = convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision));
                }
                let AmountPrecision = convertToNumber(item["amount_precision"]);
                if (AmountPrecision < 0) {
                    AmountSize = convertToNumber(Math.pow(10, Math.abs(AmountPrecision)));
                }
                else {
                    AmountSize = convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision));
                }
                let BaseAsset = String(item['base']).toLowerCase();
                let QuoteAsset = String(item['quote']).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['id']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: TickSize,
                    AmountSize: AmountSize,
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item["min_base_amount"]),
                    MaxQty: null,
                    MinNotional: convertToNumber(item["min_quote_amount"]),
                    MaxNotional: convertToNumber(item["max_quote_amount"]),
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseMarketsData2(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let Symbol = null;
                let CtVal = null;
                let CtValCcy = null;
                let Contract = null;
                let _symbol = String(item['name']).toLowerCase();
                let BaseAsset = _symbol.split('_')[0];
                let QuoteAsset = _symbol.split('_')[1];
                if (QuoteAsset === 'usd') {
                    CtVal = 1;
                    CtValCcy = QuoteAsset;
                }
                else if (QuoteAsset === 'usdt' || QuoteAsset === 'usdc') {
                    CtVal = convertToNumber(item["quanto_multiplier"]);
                    CtValCcy = BaseAsset;
                }
                if (symbolType === 'swap') {
                    Contract = 'swap';
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;

                }
                else {
                    let cycle = item["cycle"];
                    if (cycle === 'WEEKLY') {
                        Contract = 'this_week'
                    }
                    else if (cycle === 'BI_WEEKLY' || cycle === 'BI-WEEKLY') {
                        Contract = 'next_week'
                    }
                    else if (cycle === 'QUARTERLY') {
                        Contract = 'this_quarter'
                    }
                    else if (cycle === 'BI_QUARTERLY' || cycle === 'BI-QUARTERLY') {
                        Contract = 'next_quarter'
                    }
                    else {
                        Contract = cycle.replace(/-/g, '_').toLowerCase();
                    }
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['name']),
                    Contract: Contract,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item["order_price_round"]),
                    AmountSize: convertToNumber(item["order_size_min"]),
                    PricePrecision: countDecimalPlaces(item["order_price_round"]),
                    AmountPrecision: countDecimalPlaces(item["order_size_min"]),
                    MinQty: convertToNumber(item["order_size_min"]),
                    MaxQty: convertToNumber(item["order_size_max"]),
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: CtVal,
                    CtValCcy: CtValCcy,
                    Info: item
                };
            }
        }

        parseTickersData1(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let changePercentage = convertToNumber(item["change_percentage"]);
                let Last = convertToNumber(item["last"]);
                let Open = convertToNumber((Last * (1 - changePercentage * 0.01)).toFixed(countDecimalPlaces(Last)));
                let High = convertToNumber(item["high_24h"]);
                let Low = convertToNumber(item["low_24h"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                let Symbol = String(item['currency_pair']).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['currency_pair']),
                    High: High,
                    Low: Low,
                    Sell: convertToNumber(item["lowest_ask"]),
                    Buy: convertToNumber(item["highest_bid"]),
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["base_volume"]),
                    QuoteVolume: convertToNumber(item["quote_volume"]),
                    Time: null,
                    Info: item
                };
            }
        }

        parseTickersData2(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let changePercentage = convertToNumber(item["change_percentage"]);
                let Last = convertToNumber(item["last"]);
                let Open = convertToNumber((Last * (1 - changePercentage * 0.01)).toFixed(countDecimalPlaces(item["last"])));
                let High = convertToNumber(item["high_24h"]);
                let Low = convertToNumber(item["low_24h"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                let Symbol = String(item['contract']).toLowerCase() + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['contract']),
                    High: High,
                    Low: Low,
                    Sell: convertToNumber(item["lowest_ask"]),
                    Buy: convertToNumber(item["highest_bid"]),
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["volume_24h_base"]),
                    QuoteVolume: convertToNumber(item["volume_24h_quote"]),
                    Time: null,
                    Info: item
                };
            }
        }

        parseTickersData3(response, symbolObject, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let _symbol = String(item['contract']);
                if (!(_symbol in symbolObject)) {
                    continue;
                }
                let Symbol = symbolObject[_symbol];
                let changePercentage = convertToNumber(item["change_percentage"]);
                let Last = convertToNumber(item["last"]);
                let Open = convertToNumber((Last * (1 - changePercentage * 0.01)).toFixed(countDecimalPlaces(item["last"])));
                let High = convertToNumber(item["high_24h"]);
                let Low = convertToNumber(item["low_24h"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: _symbol,
                    High: High,
                    Low: Low,
                    Sell: convertToNumber(item["lowest_ask"]),
                    Buy: convertToNumber(item["highest_bid"]),
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["volume_24h_base"]),
                    QuoteVolume: convertToNumber(item["volume_24h_quote"]),
                    Time: null,
                    Info: item
                };
            }
        }

        parseKlinesData1(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }

            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1000) {
                    limit = 1000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = '1m';
            }
            else if (interval === '15m') {
                _interval = '15m';
            }
            else {
                _interval = '1d';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?currency_pair=${alias}&interval=${_interval}&limit=${limit}`;
            }
            else {
                url = `${base_url}?currency_pair=${alias}&interval=${_interval}&limit=${limit}&to=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let message = response['message'];
                if (message === 'Candlestick too long ago. Maximum 10000 points ago are allowed') {
                    return klineArray
                }
                if (!Array.isArray(response)) {
                    return
                }
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(item[0]) * 1000, convertToNumber(item[2]), convertToNumber(item[3]),
                        convertToNumber(item[4]), convertToNumber(item[5]), convertToNumber(item[6])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesData2(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 2000) {
                    limit = 2000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = '1m';
            }
            else if (interval === '15m') {
                _interval = '15m';
            }
            else {
                _interval = '1d';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}/${alias.split('_')[1].toLowerCase()}/candlesticks?contract=${alias}&interval=${_interval}&limit=${limit}`;
            }
            else {
                url = `${base_url}/${alias.split('_')[1].toLowerCase()}/candlesticks?contract=${alias}&interval=${_interval}&from=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let message = response['message'];
                if (message === 'Candlestick too long ago. Maximum 10000 points ago are allowed') {
                    return klineArray
                }
                if (!Array.isArray(response)) {
                    return
                }
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(item['t']) * 1000, convertToNumber(item['o']), convertToNumber(item['h']),
                        convertToNumber(item['l']), convertToNumber(item['c']), convertToNumber(item['v'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesIndexData(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }

            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 2000) {
                    limit = 2000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = '1m';
            }
            else if (interval === '15m') {
                _interval = '15m';
            }
            else {
                _interval = '1d';
            }
            let contract = 'index_' + alias;
            let url = null;
            if (begin === null) {
                url = `${base_url}/${alias.split('_')[1].toLowerCase()}/candlesticks?contract=${contract}&interval=${_interval}&limit=${limit}`;
            }
            else {
                url = `${base_url}/${alias.split('_')[1].toLowerCase()}/candlesticks?contract=${contract}&interval=${_interval}&from=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let message = response['message'];
                if (message === 'Candlestick too long ago. Maximum 10000 points ago are allowed') {
                    return klineArray
                }
                if (!Array.isArray(response)) {
                    return
                }
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(item['t']) * 1000, convertToNumber(item['o']), convertToNumber(item['h']),
                        convertToNumber(item['l']), convertToNumber(item['c']), convertToNumber(item['v'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesFundingData(base_url, _symbol, alias, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1000) {
                    limit = 1000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let url = `${base_url}/${alias.split('_')[1].toLowerCase()}/funding_rate?contract=${alias}&limit=${limit}`;

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let message = response['message'];
                if (message === 'Candlestick too long ago. Maximum 10000 points ago are allowed') {
                    return klineArray
                }
                if (!Array.isArray(response)) {
                    return
                }
                response.reverse();
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(item['t']) * 1000, convertToNumber(item['r'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData1(response, newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            this.swap_markets_urls.map(url => {
                let response = jsonFetch(url);
                this.parseMarketsData2(response, 'swap', newDataObject);
            });
            return newDataObject
        }

        // Markets FUTURES(交割合约)
        getMarketsFuture() {
            let newDataObject = {};
            let response = jsonFetch(this.future_markets_url);
            this.parseMarketsData2(response, 'future', newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData1(response, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            this.swap_tickers_urls.map(url => {
                let response = jsonFetch(url);
                this.parseTickersData2(response, newDataObject);
            });
            return newDataObject
        }

        // Tickers FUTURES(交割合约)
        getTickersFuture() {
            let newDataObject = {};
            let symbolObject = {};
            let markets_response = jsonFetch(this.future_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            if (!Array.isArray(markets_response)) {
                return newDataObject
            }
            for (let i = 0; i < markets_response.length; i++) {
                let item = markets_response[i];
                let Contract = '';
                let cycle = item["cycle"];
                if (cycle === 'WEEKLY') {
                    Contract = 'this_week'
                }
                else if (cycle === 'BI_WEEKLY' || cycle === 'BI-WEEKLY') {
                    Contract = 'next_week'
                }
                else if (cycle === 'QUARTERLY') {
                    Contract = 'this_quarter'
                }
                else if (cycle === 'BI_QUARTERLY' || cycle === 'BI-QUARTERLY') {
                    Contract = 'next_quarter'
                }
                else {
                    Contract = cycle.replace(/-/g, '_').toLowerCase();
                }
                let _symbol = String(item['name']);
                let BaseAsset = _symbol.split('_')[0].toLowerCase();
                let QuoteAsset = _symbol.split('_')[1].toLowerCase();
                symbolObject[_symbol] = BaseAsset + '_' + QuoteAsset + '.' + Contract;
            }
            let response = jsonFetch(this.futures_tickerss_url);
            this.parseTickersData3(response, symbolObject, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 50, _symbol, alias, interval = '1d', begin = null, limit = 1000) {
            let klineArray = this.parseKlinesData1(this.spot_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 50, _symbol, alias, interval = '1d', begin = 1546272000000, limit = 2000) {
            while (true) {
                let klineArray = this.parseKlinesData2(this.swap_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(交割合约)
        fetchKlinesFuture(sleep = 50, _symbol, alias, interval = '1d', begin = 1546272000000, limit = 2000) {
            while (true) {
                let klineArray = this.parseKlinesData2(this.future_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(价格指数)
        fetchKlinesIndex(sleep = 50, _symbol, alias, interval = '1d', begin = 1546272000000, limit = 2000) {
            while (true) {
                let klineArray = this.parseKlinesIndexData(this.index_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(资金费率)
        fetchKlinesFunding(sleep = 50, _symbol, alias, begin = null, limit = 1000) {
            let klineArray = this.parseKlinesFundingData(this.funding_url, _symbol, alias, begin, limit);
            deferSleep(sleep);
            return klineArray
        }
    }

    // HTX
    class HTX {
        constructor() {
            this.spot_markets_url = "https://api.huobi.pro/v1/common/symbols";
            this.swap_markets_urls = [
                "https://api.hbdm.com/linear-swap-api/v1/swap_contract_info?business_type=swap",
                "https://api.hbdm.com/swap-api/v1/swap_contract_info"
            ];
            this.future_markets_urls = [
                "https://api.hbdm.com/linear-swap-api/v1/swap_contract_info?business_type=futures",
                "https://api.hbdm.com/api/v1/contract_contract_info"
            ];
            this.spot_tickers_url = "https://api.huobi.pro/market/tickers";
            this.swap_tickers_urls = [
                "https://api.hbdm.com/v2/linear-swap-ex/market/detail/batch_merged?business_type=swap", 
                "https://api.hbdm.com/v2/swap-ex/market/detail/batch_merged"
            ];
            this.futures_tickerss_urls = [
                "https://api.hbdm.com/v2/linear-swap-ex/market/detail/batch_merged?business_type=futures", 
                "https://api.hbdm.com/v2/market/detail/batch_merged"
            ];
            this.spot_klines_url = "https://api.huobi.pro/market/history/kline";
            this.u_swap_klines_url = "https://api.hbdm.com/linear-swap-ex/market/history/kline";
            this.u_future_klines_url = "https://api.hbdm.com/linear-swap-ex/market/history/kline";
            this.b_swap_klines_url = "https://api.hbdm.com/swap-ex/market/history/kline";
            this.b_future_klines_url = "https://api.hbdm.com/market/history/kline";
            this.index_url = "https://api.hbdm.com/index/market/history/index";
        }

        parseMarketsData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item['state'] !== 'online') {
                    continue;
                }
                let PricePrecision = convertToNumber(item["price-precision"]);
                let AmountPrecision = convertToNumber(item["amount-precision"]);
                let BaseAsset = String(item['base-currency']).toLowerCase();
                let QuoteAsset = String(item['quote-currency']).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item["min-order-amt"]),
                    MaxQty: convertToNumber(item["max-order-amt"]),
                    MinNotional: convertToNumber(item["min-order-value"]),
                    MaxNotional: convertToNumber(item["max-order-value"]),
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseMarketsData2(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item['contract_status'] !== 1) {
                    continue;
                }
                let _symbol = String(item['contract_code']).replace(/-/g, '_').toLowerCase();
                let BaseAsset = _symbol.split('_')[0];
                let QuoteAsset = _symbol.split('_')[1];
                let Contract = 'swap'
                let Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;

                let CtValCcy = null;
                if (QuoteAsset === 'usd') {
                    CtValCcy = QuoteAsset;
                }
                else if (QuoteAsset === 'usdt') {
                    CtValCcy = BaseAsset;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['contract_code']),
                    Contract: Contract,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item["price_tick"]),
                    AmountSize: null,
                    PricePrecision: countDecimalPlaces(item["price_tick"]),
                    AmountPrecision: null,
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: convertToNumber(item["contract_size"]),
                    CtValCcy: CtValCcy,
                    Info: item
                };
            }
        }

        parseMarketsData3(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item['contract_status'] !== 1) {
                    continue;
                }
                let QuoteAsset = null;
                let BaseAsset = String(item['symbol']).toLowerCase();
                if (symbolType === 'swap') {
                    QuoteAsset = String(item['trade_partition']).toLowerCase();
                }
                else {
                    QuoteAsset = 'usd';
                }
                let Contract = null;
                let contractType = item['contract_type'].toLowerCase();
                if (contractType == 'quarter') {
                    Contract = 'this_quarter';
                }
                else {
                    Contract = contractType;
                }

                let Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;

                let CtValCcy = null;
                if (QuoteAsset === 'usd') {
                    CtValCcy = QuoteAsset;
                }
                else if (QuoteAsset === 'usdt') {
                    CtValCcy = BaseAsset;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['contract_code']),
                    Contract: Contract,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item["price_tick"]),
                    AmountSize: null,
                    PricePrecision: countDecimalPlaces(item["price_tick"]),
                    AmountPrecision: null,
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: convertToNumber(item["contract_size"]),
                    CtValCcy: CtValCcy,
                    Info: item
                };
            }
        }

        parseTickersData1(response, symbolObject, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            let Time = convertToNumber(response["ts"]);
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let _symbol = String(item['symbol']);
                if (!(_symbol in symbolObject)) {
                    continue;
                }
                let Symbol = symbolObject[_symbol];
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: _symbol,
                    High: convertToNumber(item["high"]),
                    Low: convertToNumber(item["low"]),
                    Sell: convertToNumber(item["ask"]),
                    Buy: convertToNumber(item["bid"]),
                    Last: convertToNumber(item["close"]),
                    Open: convertToNumber(item["open"]),
                    Volume: convertToNumber(item["amount"]),
                    QuoteVolume: convertToNumber(item["vol"]),
                    Time: Time,
                    Info: item
                };
            }
        }

        parseTickersData2(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["ticks"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Symbol = String(item['contract_code']).replace(/-/g, '_').toLowerCase() + '.swap';
                let Sell = item["ask"];
                if (Array.isArray(Sell)) {
                    Sell = convertToNumber(Sell[0]);
                }
                let Buy = item["bid"];
                if (Array.isArray(Buy)) {
                    Buy = convertToNumber(Buy[0]);
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['contract_code']),
                    High: convertToNumber(item["high"]),
                    Low: convertToNumber(item["low"]),
                    Sell: Sell,
                    Buy: Buy,
                    Last: convertToNumber(item["close"]),
                    Open: convertToNumber(item["open"]),
                    Volume: convertToNumber(item["amount"]),
                    QuoteVolume: convertToNumber(item["vol"]),
                    Time: convertToNumber(item["ts"]),
                    Info: item
                };
            }
        }

        parseTickersData3(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["ticks"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Symbol = null;
                let Contract = null;
                let Alias = null;
                if (symbolType === 'swap') {
                    let _symbol = String(item['contract_code']).replace(/-/g, '_').toLowerCase();
                    let symbol_list = _symbol.split('_');
                    if (symbol_list.length !== 3) {
                        continue;
                    }
                    if (symbol_list[2] === 'cw') {
                        Contract = 'this_week';
                    }
                    else if (symbol_list[2] === 'nw') {
                        Contract = 'next_week';
                    }
                    else if (symbol_list[2] === 'cq') {
                        Contract = 'this_quarter';
                    }
                    else if (symbol_list[2] === 'nq') {
                        Contract = 'next_quarter';
                    }
                    else {
                        Contract = symbol_list[2];
                    }
                    Symbol = symbol_list[0] + '_' + symbol_list[1] + '.' + Contract;
                    Alias = String(item['contract_code']);
                }
                else {
                    let _symbol = String(item['symbol']).replace(/-/g, '_').toLowerCase();
                    let symbol_list = _symbol.split('_');
                    if (symbol_list.length !== 2) {
                        continue;
                    }
                    if (symbol_list[1] === 'cw') {
                        Contract = 'this_week';
                    }
                    else if (symbol_list[1] === 'nw') {
                        Contract = 'next_week';
                    }
                    else if (symbol_list[1] === 'cq') {
                        Contract = 'this_quarter';
                    }
                    else if (symbol_list[1] === 'nq') {
                        Contract = 'next_quarter';
                    }
                    else {
                        Contract = symbol_list[1];
                    }
                    Symbol = symbol_list[0] + '_usd.' + Contract;
                    Alias = String(item['symbol']);
                }
                let Sell = item["ask"];
                if (Array.isArray(Sell)) {
                    Sell = convertToNumber(Sell[0]);
                }
                let Buy = item["bid"];
                if (Array.isArray(Buy)) {
                    Buy = convertToNumber(Buy[0]);
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: Alias,
                    High: convertToNumber(item["high"]),
                    Low: convertToNumber(item["low"]),
                    Sell: Sell,
                    Buy: Buy,
                    Last: convertToNumber(item["close"]),
                    Open: convertToNumber(item["open"]),
                    Volume: convertToNumber(item["amount"]),
                    QuoteVolume: convertToNumber(item["vol"]),
                    Time: convertToNumber(item["ts"]),
                    Info: item
                };
            }
        }

        parseKlinesData1(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 2000) {
                    limit = 2000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = '1min';
            }
            else if (interval === '15m') {
                _interval = '15min';
            }
            else {
                _interval = '1day';
            }

            let url = `${base_url}?symbol=${alias}&period=${_interval}&size=${limit}`;

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let err_msg = response['err-msg'];
                if (err_msg === 'history kline query with invalid from to') {
                    return klineArray
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                dataArray.reverse();
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['id']) * 1000, convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['vol'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesData2(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }

            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 2000) {
                    limit = 2000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = '1min';
            }
            else if (interval === '15m') {
                _interval = '15min';
            }
            else {
                _interval = '1day';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?contract_code=${alias}&period=${_interval}&size=${limit}`;
            }
            else {
                if (interval === '1m') {
                    endBegin = begin + (limit - 1) * 60;
                }
                else if (interval === '15m') {
                    endBegin = begin + (limit - 1) * 900;
                }
                else {
                    endBegin = begin + (limit - 1) * 86400;
                }
                let date_now = Math.floor(Date.now() / 1000);
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?contract_code=${alias}&period=${_interval}&from=${begin}&to=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let err_msg = response['err-msg'];
                if (err_msg === 'history kline query with invalid from to') {
                    return klineArray
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['id']) * 1000, convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['vol'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesData3(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }

            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 2000) {
                    limit = 2000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = '1min';
            }
            else if (interval === '15m') {
                _interval = '15min';
            }
            else {
                _interval = '1day';
            }
            let contract = _symbol.split('.')[1];
            if (contract === 'this_week') {
                contract = 'CW'
            }
            else if (contract === 'next_week') {
                contract = 'NW'
            }
            else if (contract === 'this_quarter') {
                contract = 'CQ'
            }
            else if (contract === 'next_quarter') {
                contract = 'NQ'
            }

            let alias_list = alias.split('-');
            let contract_code = alias_list[0] + '-' + alias_list[1] + '-' + contract;

            let url = null;
            if (begin === null) {
                url = `${base_url}?contract_code=${contract_code}&period=${_interval}&size=${limit}`;
            }
            else {
                if (interval === '1m') {
                    endBegin = begin + (limit - 1) * 60;
                }
                else if (interval === '15m') {
                    endBegin = begin + (limit - 1) * 900;
                }
                else {
                    endBegin = begin + (limit - 1) * 86400;
                }
                let date_now = Math.floor(Date.now() / 1000);
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?contract_code=${contract_code}&period=${_interval}&from=${begin}&to=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let err_msg = response['err-msg'];
                if (err_msg === 'history kline query with invalid from to') {
                    return klineArray
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['id']) * 1000, convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['vol'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesData4(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }

            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 2000) {
                    limit = 2000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = '1min';
            }
            else if (interval === '15m') {
                _interval = '15min';
            }
            else {
                _interval = '1day';
            }
            let contract = _symbol.split('.')[1];
            if (contract === 'this_week') {
                contract = 'CW'
            }
            else if (contract === 'next_week') {
                contract = 'NW'
            }
            else if (contract === 'this_quarter') {
                contract = 'CQ'
            }
            else if (contract === 'next_quarter') {
                contract = 'NQ'
            }

            alias = _symbol.toUpperCase().split('_')[0] + '_' + contract;
            
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&period=${_interval}&size=${limit}`;
            }
            else {
                if (interval === '1m') {
                    endBegin = begin + (limit - 1) * 60;
                }
                else if (interval === '15m') {
                    endBegin = begin + (limit - 1) * 900;
                }
                else {
                    endBegin = begin + (limit - 1) * 86400;
                }
                let date_now = Math.floor(Date.now() / 1000);
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?symbol=${alias}&period=${_interval}&from=${begin}&to=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let err_msg = response['err-msg'];
                if (err_msg === 'history kline query with invalid from to') {
                    return klineArray
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['id']) * 1000, convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['vol'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesIndexData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 2000) {
                    limit = 2000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }

            let _interval = null;
            if (interval === '1m') {
                _interval = '1min';
            }
            else if (interval === '15m') {
                _interval = '15min';
            }
            else {
                _interval = '1day';
            }

            let url = `${base_url}?symbol=${alias}&period=${_interval}&size=${limit}`;

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let err_msg = response['err-msg'];
                if (err_msg === 'history kline query with invalid from to') {
                    return klineArray
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['id']) * 1000, convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), 0]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData1(response, newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            this.swap_markets_urls.map(url => {
                let response = jsonFetch(url);
                this.parseMarketsData2(response, newDataObject);
            });
            return newDataObject
        }

        // Markets FUTURES(交割合约)
        getMarketsFuture() {
            let newDataObject = {};
            let u_response = jsonFetch(this.future_markets_urls[0]);
            this.parseMarketsData3(u_response, 'swap', newDataObject);

            let b_response = jsonFetch(this.future_markets_urls[1]);
            this.parseMarketsData3(b_response, 'future', newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let symbolObject = {};
            let markets_response = jsonFetch(this.spot_markets_url);
            if (markets_response === null) {
                return
            }
            let dataArray = markets_response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item['state'] !== 'online') {
                    continue;
                }
                let BaseAsset = String(item['base-currency']).toLowerCase();
                let QuoteAsset = String(item['quote-currency']).toLowerCase();
                let _symbol = String(item['symbol']);
                symbolObject[_symbol] = BaseAsset + '_' + QuoteAsset;
            }
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData1(response, symbolObject, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            this.swap_tickers_urls.map(url => {
                let response = jsonFetch(url);
                this.parseTickersData2(response, newDataObject);
            });
            return newDataObject
        }

        // Tickers FUTURES(交割合约)
        getTickersFuture() {
            let newDataObject = {};
            let u_response = jsonFetch(this.futures_tickerss_urls[0]);
            this.parseTickersData3(u_response, 'swap', newDataObject);

            let b_response = jsonFetch(this.futures_tickerss_urls[1]);
            this.parseTickersData3(b_response, 'future', newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 80, _symbol, alias, interval = '1d', begin = null, limit = 2000) {
            let klineArray = this.parseKlinesData1(this.spot_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 10, _symbol, alias, interval = '1d', begin = 1582992000000, limit = 2000) {
            let swap_klines_url = null;
            if (alias.includes('-') && alias.split('-')[1] === 'USD') {
                swap_klines_url = this.b_swap_klines_url;
            }
            else {
                swap_klines_url = this.u_swap_klines_url;
            }
            while (true) {
                let klineArray = this.parseKlinesData2(swap_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(交割合约)
        fetchKlinesFuture(sleep = 10, _symbol, alias, interval = '1d', begin = 1582992000000, limit = 2000) {
            while (true) {
                let klineArray = null;
                if (alias.includes('-') && alias.split('-')[1] === 'USDT') {
                    klineArray = this.parseKlinesData3(this.u_future_klines_url, _symbol, alias, interval, begin, limit);
                }
                else {
                    klineArray = this.parseKlinesData4(this.b_future_klines_url, _symbol, alias, interval, begin, limit);
                }
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(价格指数)
        fetchKlinesIndex(sleep = 10, _symbol, alias, interval = '1d', begin = null, limit = 2000) {
            let klineArray = this.parseKlinesIndexData(this.index_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }
    }

    // Bitfinex
    class Bitfinex {
        constructor() {
            this.spot_markets_url = "https://api.bitfinex.com/v1/symbols_details";
            this.swap_markets_url = "https://api.bitfinex.com/v1/symbols_details";
            this.spot_tickers_url = "https://api-pub.bitfinex.com/v2/tickers?symbols=ALL";
            this.swap_tickers_url = "https://api-pub.bitfinex.com/v2/tickers?symbols=ALL";
            this.spot_klines_url = "https://api-pub.bitfinex.com/v2/candles/trade";
            this.swap_klines_url = "https://api-pub.bitfinex.com/v2/candles/trade";
        }

        parseMarketsData(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let Symbol = null;
                let Contract = null;
                let BaseAsset = null;
                let QuoteAsset = null
                let CtVal = null;
                let CtValCcy = null;
                let _symbol = String(item['pair']).toLowerCase();
                if (symbolType === 'spot') {
                    if (_symbol.includes('0')) {
                        continue;
                    }
                    if (_symbol.includes(':')) {
                        BaseAsset = _symbol.split(':')[0];
                        QuoteAsset = _symbol.split(':')[1];
                    }
                    else {
                        QuoteAsset = _symbol.slice(-3);
                        BaseAsset = _symbol.replace(QuoteAsset, '');
                    }
                    Symbol = BaseAsset + '_' + QuoteAsset;
                }
                else {
                    if (!_symbol.includes('0')) {
                        continue;
                    }
                    Contract = 'swap';
                    if (_symbol.includes(':')) {
                        BaseAsset = _symbol.split(':')[0];
                        QuoteAsset = _symbol.split(':')[1];
                        Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                    }
                    else {
                        Symbol = _symbol + '.' + Contract;
                    }
                    if (QuoteAsset === 'usd') {
                        CtVal = 1;
                        CtValCcy = QuoteAsset;
                    }
                    else if (QuoteAsset === 'ustf0' || QuoteAsset === 'testusdtf0' || QuoteAsset === 'btcf0') {
                        CtVal = 1;
                        CtValCcy = BaseAsset;
                    }
                }
                let PricePrecision = convertToNumber(item["price_precision"]);
                let AmountPrecision = countDecimalPlaces(item["minimum_order_size"]);
                let TickSize = convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision));
                let AmountSize = convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision));
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['pair']),
                    Contract: Contract,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: TickSize,
                    AmountSize: AmountSize,
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item["minimum_order_size"]),
                    MaxQty: convertToNumber(item["maximum_order_size"]),
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: CtVal,
                    CtValCcy: CtValCcy,
                    Info: item
                };
            }
        }

        parseTickersData(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let Symbol = null;
                let BaseAsset = null;
                let QuoteAsset = null
                let _symbol = String(item[0]).toLowerCase();
                if (symbolType === 'spot') { 
                    if (_symbol[0] !== 't' || _symbol.includes('0')) {
                        continue;
                    }
                    if (_symbol.includes(':')) {
                        BaseAsset = _symbol.split(':')[0];
                        QuoteAsset = _symbol.split(':')[1];
                    }
                    else {
                        QuoteAsset = _symbol.slice(-3);
                        BaseAsset = _symbol.replace(QuoteAsset, '');
                    }
                    Symbol = BaseAsset.substring(1) + '_' + QuoteAsset;
                }
                else {
                    if (_symbol[0] !== 't' || !_symbol.includes('0')) {
                        continue;
                    }
                    if (_symbol.includes(':')) {
                        BaseAsset = _symbol.split(':')[0];
                        QuoteAsset = _symbol.split(':')[1];
                        Symbol = BaseAsset.substring(1) + '_' + QuoteAsset + '.swap';
                    }
                    else {
                        Symbol = _symbol.substring(1) + '.swap';
                    }
                }
                let Last = convertToNumber(item[7]);
                let dailyChange = convertToNumber(item[5]);
                let Open = convertToNumber((Last - dailyChange).toFixed(countDecimalPlaces(Last)));
                let High = convertToNumber(item[9]);
                let Low = convertToNumber(item[10]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item[0]),
                    High: High,
                    Low: Low,
                    Sell: convertToNumber(item[3]),
                    Buy: convertToNumber(item[1]),
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item[8]),
                    QuoteVolume: null,
                    Time: null,
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 2000) {
                    limit = 2000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = '1m';
            }
            else if (interval === '15m') {
                _interval = '15m';
            }
            else {
                _interval = '1D';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}%3A${_interval}%3At${alias.toUpperCase()}/hist?limit=${limit}`;
            }
            else {
                url = `${base_url}%3A${_interval}%3At${alias.toUpperCase()}/hist?limit=${limit}&start=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (String(response).includes("error")) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                response.reverse();
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[3]),
                        convertToNumber(item[4]), convertToNumber(item[2]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, 'spot', newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData(response, 'swap', newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {}; 
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, 'spot', newDataObject);
            return newDataObject
        }

        // Tickers Swap(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData(response, 'swap', newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 6000, _symbol, alias, interval = '1d', begin = 1362067200000, limit = 2000) {
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 6000, _symbol, alias, interval = '1d', begin = 1564588800000, limit = 2000) {
            while (true) {
                let klineArray = this.parseKlinesData(this.swap_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // MEXC
    class MEXC {
        constructor() {
            this.spot_markets_url = "https://api.mexc.com/api/v3/exchangeInfo";
            this.swap_markets_url = "https://contract.mexc.com/api/v1/contract/detail";
            this.spot_tickers_url = "https://api.mexc.com/api/v3/ticker/24hr";
            this.swap_tickers_url = "https://contract.mexc.com/api/v1/contract/ticker";
            this.spot_klines_url = "https://api.mexc.com/api/v3/klines";
            this.swap_klines_url = "https://contract.mexc.com/api/v1/contract/kline";
            this.index_url = "https://contract.mexc.com/api/v1/contract/kline/index_price";
            this.funding_url = "https://contract.mexc.com/api/v1/contract/funding_rate/history";
        }

        parseMarketsData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["symbols"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = String(item['baseAsset']).toLowerCase();
                let QuoteAsset = String(item['quoteAsset']).toLowerCase();
                let PricePrecision = convertToNumber(item['quotePrecision']);
                let AmountPrecision = convertToNumber(item['baseAssetPrecision']);
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item['baseSizePrecision']),
                    MaxQty: null,
                    MinNotional: convertToNumber(item['quoteAmountPrecision']),
                    MaxNotional: convertToNumber(item['maxQuoteAmount']),
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseMarketsData2(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = String(item['baseCoin']).toLowerCase();
                let QuoteAsset = String(item['quoteCoin']).toLowerCase();
                let CtValCcy = null;
                if (QuoteAsset === 'usd') {
                    CtValCcy = QuoteAsset;
                }
                else if (QuoteAsset === 'usdt' || QuoteAsset === 'usdc') {
                    CtValCcy = BaseAsset;
                }
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: 'swap',
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item['priceUnit']),
                    AmountSize: convertToNumber(item['volUnit']),
                    PricePrecision: convertToNumber(item['priceScale']),
                    AmountPrecision: convertToNumber(item['volScale']),
                    MinQty: convertToNumber(item['minVol']),
                    MaxQty: convertToNumber(item['maxVol']),
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: convertToNumber(item['contractSize']),
                    CtValCcy: CtValCcy,
                    Info: item
                };
            }
        }

        parseTickersData1(response, symbolObject, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let _symbol = String(item['symbol']);
                if (!(_symbol in symbolObject)) {
                    continue;
                }
                let Symbol = symbolObject[_symbol];
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: _symbol,
                    High: convertToNumber(item["highPrice"]),
                    Low: convertToNumber(item["lowPrice"]),
                    Sell: convertToNumber(item["askPrice"]),
                    Buy: convertToNumber(item["bidPrice"]),
                    Last: convertToNumber(item["lastPrice"]),
                    Open: convertToNumber(item["openPrice"]),
                    Volume: convertToNumber(item["volume"]),
                    QuoteVolume: convertToNumber(item["quoteVolume"]),
                    Time: convertToNumber(item["closeTime"]),
                    Info: item
                };
            }
        }

        parseTickersData2(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Symbol = String(item['symbol']).replace(/-/g, '_').toLowerCase() + '.swap';
                let Last = convertToNumber(item["lastPrice"]);
                let riseFallValue = convertToNumber(item["riseFallValue"]);
                let Open = convertToNumber((Last - riseFallValue).toFixed(countDecimalPlaces(Last)));
                let Low = convertToNumber(item["lower24Price"]);
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    High: convertToNumber(item["high24Price"]),
                    Low: Low,
                    Sell: convertToNumber(item["ask1"]),
                    Buy: convertToNumber(item["bid1"]),
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["volume24"]),
                    QuoteVolume: convertToNumber(item["amount24"]),
                    Time: convertToNumber(item["timestamp"]),
                    Info: item
                };
            }
        }

        parseKlinesData1(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1000) {
                    limit = 1000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = '1m';
            }
            else if (interval === '15m') {
                _interval = '15m';
            }
            else {
                _interval = '1d';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&interval=${_interval}&limit=${limit}`;
            }
            else {
                if (interval === '1m') {
                    endBegin = begin + (limit - 1) * 60000;
                }
                else if (interval === '15m') {
                    endBegin = begin + (limit - 1) * 900000;
                }
                else {
                    endBegin = begin + (limit - 1) * 86400000;
                }
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?symbol=${alias}&interval=${_interval}&limit=${limit}&startTime=${begin}&endTime=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesData2(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 2000) {
                    limit = 2000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = 'Min1';
            }
            else if (interval === '15m') {
                _interval = 'Min15';
            }
            else {
                _interval = 'Day1';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}/${alias}?interval=${_interval}`;
            }
            else {
                url = `${base_url}/${alias}?interval=${_interval}&end=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let data = response["data"];
                if (Object.prototype.toString.call(data) !== '[object Object]') {
                    return
                }
                let timeArray = data['time'];
                let openArray = data['open'];
                let highArray = data['high'];
                let lowArray = data['low'];
                let closeArray = data['close'];
                let volumeArray = data['vol'];
                if (!Array.isArray(timeArray)) {
                    return
                }
                for (let i = 0; i < timeArray.length; i++) {
                    klineArray.push([_symbol, convertToNumber(timeArray[i]) * 1000, convertToNumber(openArray[i]), convertToNumber(highArray[i]),
                        convertToNumber(lowArray[i]), convertToNumber(closeArray[i]), convertToNumber(volumeArray[i])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesIndexData(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 2000) {
                    limit = 2000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = 'Min1';
            }
            else if (interval === '15m') {
                _interval = 'Min15';
            }
            else {
                _interval = 'Day1';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}/${alias}?interval=${_interval}`;
            }
            else {
                url = `${base_url}/${alias}?interval=${_interval}&end=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let data = response["data"];
                if (Object.prototype.toString.call(data) !== '[object Object]') {
                    return
                }
                let timeArray = data['time'];
                let openArray = data['open'];
                let highArray = data['high'];
                let lowArray = data['low'];
                let closeArray = data['close'];
                if (!Array.isArray(timeArray)) {
                    return
                }
                for (let i = 0; i < timeArray.length; i++) {
                    klineArray.push([_symbol, convertToNumber(timeArray[i]) * 1000, convertToNumber(openArray[i]), convertToNumber(highArray[i]),
                        convertToNumber(lowArray[i]), convertToNumber(closeArray[i]), 0]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesFundingData(base_url, _symbol, alias, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 100) {
                    limit = 100;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let url = null;
            if (begin === null) {
                return
            }
            else {
                let date_now = Date.now();
                let page_num = Math.floor((date_now - begin) / 86400000 / 30);
                url = `${base_url}?symbol=${alias}&page_size=${limit}&page_num=${page_num}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let data = response["data"];
                if (Object.prototype.toString.call(data) !== '[object Object]') {
                    return
                }
                let dataArray = data['resultList'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                dataArray.reverse();
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['settleTime']), convertToNumber(item['fundingRate'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData1(response, newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData2(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let symbolObject = {};
            let markets_response = jsonFetch(this.spot_markets_url);
            if (markets_response === null) {
                return
            }
            let dataArray = markets_response["symbols"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = String(item['baseAsset']).toLowerCase();
                let QuoteAsset = String(item['quoteAsset']).toLowerCase();
                let _symbol = String(item['symbol']);
                symbolObject[_symbol] = BaseAsset + '_' + QuoteAsset;
            }
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData1(response, symbolObject, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData2(response, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 20, _symbol, alias, interval = '1d', begin = 1506787200000, limit = 1000) {
            while (true) {
                let klineArray = this.parseKlinesData1(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 100, _symbol, alias, interval = '1d', begin = null, limit = 2000) {
            let klineArray = this.parseKlinesData2(this.swap_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(价格指数)
        fetchKlinesIndex(sleep = 100, _symbol, alias, interval = '1d', begin = null, limit = 2000) {
            let klineArray = this.parseKlinesIndexData(this.index_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(资金费率)
        fetchKlinesFunding(sleep = 100, _symbol, alias, begin = 1675180800000, limit = 100) {
            while (true) {
                let klineArray = this.parseKlinesFundingData(this.funding_url, _symbol, alias, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // Bitget
    class Bitget {
        constructor() {
            this.spot_markets_url = "https://api.bitget.com/api/v2/spot/public/symbols";
            this.swap_markets_urls = [
                "https://api.bitget.com/api/v2/mix/market/contracts?productType=USDT-FUTURES",
                "https://api.bitget.com/api/v2/mix/market/contracts?productType=COIN-FUTURES",
            ];
            this.future_markets_urls = [
                "https://api.bitget.com/api/v2/mix/market/contracts?productType=USDT-FUTURES",
                "https://api.bitget.com/api/v2/mix/market/contracts?productType=COIN-FUTURES",
            ];
            this.spot_tickers_url = "https://api.bitget.com/api/v2/spot/market/tickers";
            this.swap_tickers_urls = [
                "https://api.bitget.com/api/v2/mix/market/tickers?productType=USDT-FUTURES",
                "https://api.bitget.com/api/v2/mix/market/tickers?productType=COIN-FUTURES",
            ];
            this.future_tickers_urls = [
                "https://api.bitget.com/api/v2/mix/market/tickers?productType=USDT-FUTURES",
                "https://api.bitget.com/api/v2/mix/market/tickers?productType=COIN-FUTURES",
            ];
            this.spot_klines_url = "https://api.bitget.com/api/v2/spot/market/history-candles";
            this.swap_klines_url = "https://api.bitget.com/api/v2/mix/market/history-candles";
            this.future_klines_url = "https://api.bitget.com/api/v2/mix/market/history-candles";
            this.index_url = "https://api.bitget.com/api/v2/mix/market/history-index-candles";
            this.funding_url = "https://api.bitget.com/api/v2/mix/market/history-fund-rate";
        }

        parseMarketsData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let MinNotional = null;
                let BaseAsset = String(item['baseCoin']).toLowerCase();
                let QuoteAsset = String(item['quoteCoin']).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                if (QuoteAsset === 'usdt') {
                    MinNotional = convertToNumber(item['minTradeUSDT'])
                }
                let PricePrecision = convertToNumber(item['pricePrecision']);
                let AmountPrecision = convertToNumber(item['quantityPrecision']);
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item['minTradeAmount']),
                    MaxQty: convertToNumber(item['maxTradeAmount']),
                    MinNotional: MinNotional,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseMarketsData2(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Symbol = null;
                let Contract = null;
                let CtVal = null;
                let CtValCcy = null;
                let MinNotional = null;
                let BaseAsset = String(item['baseCoin']).toLowerCase();
                let QuoteAsset = String(item['quoteCoin']).toLowerCase();
                if (symbolType === 'swap') {
                    if (item['symbolType'] !== 'perpetual') {
                        continue;
                    }
                    Contract = 'swap';
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                }
                else {
                    if (item['symbolType'] !== 'delivery') {
                        continue;
                    }
                    Contract = item["deliveryPeriod"].toLowerCase();
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                }
                if (QuoteAsset === 'usd') {
                    CtVal = 1;
                    CtValCcy = QuoteAsset;
                }
                else if (QuoteAsset === 'usdt' || QuoteAsset === 'usdc') {
                    CtVal = 1;
                    CtValCcy = BaseAsset;
                }
                if (QuoteAsset === 'usdt') {
                    MinNotional = convertToNumber(item['minTradeUSDT'])
                }
                let PricePrecision = convertToNumber(item['pricePlace']);
                let AmountPrecision = convertToNumber(item['volumePlace']);
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: Contract,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: convertToNumber(item['sizeMultiplier']),
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item['minTradeNum']),
                    MaxQty: convertToNumber(item['maxPositionNum']),
                    MinNotional: MinNotional,
                    MaxNotional: null,
                    CtVal: CtVal,
                    CtValCcy: CtValCcy,
                    Info: item
                };
            }
        }

        parseTickersData(response, symbolType, symbolObject, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let _symbol = String(item['symbol']);
                if (!(_symbol in symbolObject)) {
                    continue;
                }
                let Symbol = symbolObject[_symbol];
                let Open = null;
                if (symbolType === 'spot') {
                    Open = convertToNumber(item["open"]);
                }
                else if (symbolType === 'swap') {
                    if (item['deliveryStatus'] !== '') {
                        continue;
                    }
                    Open = convertToNumber(item["open24h"]);
                }
                else {
                    if (item['deliveryStatus'] === '') {
                        continue;
                    }
                    Open = convertToNumber(item["open24h"]);
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: _symbol,
                    High: convertToNumber(item["high24h"]),
                    Low: convertToNumber(item["low24h"]),
                    Sell: convertToNumber(item["askPr"]),
                    Buy: convertToNumber(item["bidPr"]),
                    Last: convertToNumber(item["lastPr"]),
                    Open: Open,
                    Volume: convertToNumber(item["baseVolume"]),
                    QuoteVolume: convertToNumber(item["quoteVolume"]),
                    Time: convertToNumber(item["ts"]),
                    Info: item
                };
            }
        }

        parseKlinesData1(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 200) {
                    limit = 200;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = '1min';
            }
            else if (interval === '15m') {
                _interval = '15min';
            }
            else {
                _interval = '1day';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&granularity=${_interval}&limit=${limit}`;
            }
            else {
                if (interval === '1m') {
                    begin += 60000;
                }
                else if (interval === '15m') {
                    begin += 900000;
                }
                else {
                    begin += 86400000;
                }
                url = `${base_url}?symbol=${alias}&granularity=${_interval}&limit=${limit}&endTime=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (dataArray === null) {
                    return klineArray
                }
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesData2(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 200) {
                    limit = 200;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = '1m';
            }
            else if (interval === '15m') {
                _interval = '15m';
            }
            else {
                _interval = '1D';
                limit = 90;

            }
            let productType = null;
            if (alias.slice(-4) === 'USDT') {
                productType = 'USDT-FUTURES';
            }
            else {
                productType = 'COIN-FUTURES';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?productType=${productType}&symbol=${alias}&granularity=${_interval}&limit=${limit}`;
            }
            else {
                if (interval === '1m') {
                    begin += 60000;
                }
                else if (interval === '15m') {
                    begin += 900000;
                }
                else {
                    begin += 86400000;
                }
                url = `${base_url}?productType=${productType}&symbol=${alias}&granularity=${_interval}&limit=${limit}&endTime=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (dataArray === null) {
                    return klineArray
                }
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesIndexData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 200) {
                    limit = 200;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }

            let _interval = null;
            if (interval === '1m') {
                _interval = '1m';
            }
            else if (interval === '15m') {
                _interval = '15m';
            }
            else {
                _interval = '1D';
                limit = 90;
            }
            let productType = null;
            if (alias.slice(-4) === 'USDT') {
                productType = 'USDT-FUTURES';
            }
            else {
                productType = 'COIN-FUTURES';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?productType=${productType}&symbol=${alias}&granularity=${_interval}&limit=${limit}`;
            }
            else {
                if (interval === '1m') {
                    begin += 60000;
                }
                else if (interval === '15m') {
                    begin += 900000;
                }
                else {
                    begin += 86400000;
                }
                url = `${base_url}?productType=${productType}&symbol=${alias}&granularity=${_interval}&limit=${limit}&endTime=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (dataArray === null) {
                    return klineArray
                }
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), 0]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesFundingData(base_url, _symbol, alias, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 100) {
                    limit = 100;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let productType = null;
            if (alias.slice(-4) === 'USDT') {
                productType = 'USDT-FUTURES';
            }
            else {
                productType = 'COIN-FUTURES';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?productType=${productType}&symbol=${alias}&pageSize=${limit}`;
            }
            else {
                let pageNo = Math.floor((Date.now() - begin) / 86400000 / 30);
                url = `${base_url}?productType=${productType}&symbol=${alias}&pageSize=${limit}&pageNo=${pageNo}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (dataArray === null) {
                    return klineArray
                }
                if (!Array.isArray(dataArray)) {
                    return
                }
                dataArray.reverse();
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['fundingTime']), convertToNumber(item['fundingRate'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData1(response, newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            this.swap_markets_urls.map(url => {
                let response = jsonFetch(url);
                this.parseMarketsData2(response, 'swap', newDataObject);
            });
            return newDataObject
        }

        // Markets FUTURES(交割合约)
        getMarketsFuture() {
            let newDataObject = {};
            this.future_markets_urls.map(url => {
                let response = jsonFetch(url);
                this.parseMarketsData2(response, 'future', newDataObject);
            });
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let symbolObject = {};
            let markets_response = jsonFetch(this.spot_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            let dataArray = markets_response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = String(item['baseCoin']).toLowerCase();
                let QuoteAsset = String(item['quoteCoin']).toLowerCase();
                let _symbol = String(item['symbol']);
                symbolObject[_symbol] = BaseAsset + '_' + QuoteAsset;
            }
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, 'spot', symbolObject, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let symbolObject = {};
            this.swap_markets_urls.map(url => {
                let markets_response = jsonFetch(url);
                if (markets_response === null) {
                    return newDataObject
                }
                let dataArray = markets_response["data"];
                if (!Array.isArray(dataArray)) {
                    return newDataObject
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    if (item['symbolType'] !== 'perpetual') {
                        continue;
                    }
                    let BaseAsset = String(item["baseCoin"]).toLowerCase();
                    let QuoteAsset = String(item["quoteCoin"]).toLowerCase();
                    let _symbol = String(item['symbol']);
                    symbolObject[_symbol] = BaseAsset + '_' + QuoteAsset + '.swap';
                }
            });
            this.swap_tickers_urls.map(url => {
                let response = jsonFetch(url);
                this.parseTickersData(response, 'swap', symbolObject, newDataObject);
            });
            return newDataObject
        }

        // Tickers FUTURES(交割合约)
        getTickersFuture() {
            let newDataObject = {};
            let symbolObject = {};
            this.future_markets_urls.map(url => {
                let markets_response = jsonFetch(url);
                if (markets_response === null) {
                    return newDataObject
                }
                let dataArray = markets_response["data"];
                if (!Array.isArray(dataArray)) {
                    return newDataObject
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    if (item['symbolType'] !== 'delivery') {
                        continue;
                    }
                    let BaseAsset = String(item["baseCoin"]).toLowerCase();
                    let QuoteAsset = String(item["quoteCoin"]).toLowerCase();
                    let Contract = item["deliveryPeriod"].toLowerCase();
                    let _symbol = String(item['symbol']);
                    symbolObject[_symbol] = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                }
            });
            this.future_tickers_urls.map(url => {
                let response = jsonFetch(url);
                this.parseTickersData(response, 'future', symbolObject, newDataObject);
            });
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 50, _symbol, alias, interval = '1d', begin = null, limit = 200) {
            let klineArray = this.parseKlinesData1(this.spot_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 50, _symbol, alias, interval = '1d', begin = null, limit = 200) {
            let klineArray = this.parseKlinesData2(this.swap_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(交割合约)
        fetchKlinesFuture(sleep = 50, _symbol, alias, interval = '1d', begin = null, limit = 200) {
            let klineArray = this.parseKlinesData2(this.future_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(价格指数)
        fetchKlinesIndex(sleep = 50, _symbol, alias, interval = '1d', begin = null, limit = 200) {
            let klineArray = this.parseKlinesIndexData(this.index_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(资金费率)
        fetchKlinesFunding(sleep = 50, _symbol, alias, begin = 1619798400000, limit = 100) {
            while (true) {
                let klineArray = this.parseKlinesFundingData(this.funding_url, _symbol, alias, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // Bitstamp
    class Bitstamp {
        constructor() {
            this.spot_markets_url = "https://www.bitstamp.net/api/v2/trading-pairs-info/";
            this.spot_tickers_url = "https://www.bitstamp.net/api/v2/ticker/";
            this.spot_klines_url = "https://www.bitstamp.net/api/v2/ohlc";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let Symbol = String(item['name']).replace('/', '_').toLowerCase();
                let PricePrecision = convertToNumber(item['counter_decimals']);
                let AmountPrecision = convertToNumber(item['base_decimals']);
                let MinNotional = null;
                let MinNotionalList = item["minimum_order"].match(/\d+/g);
                if (MinNotionalList.length > 0) {
                    MinNotional = convertToNumber(MinNotionalList[0]);
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['name']),
                    Contract: null,
                    BaseAsset: Symbol.split('_')[0],
                    QuoteAsset: Symbol.split('_')[1],
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: MinNotional,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let Symbol = String(item['pair']).replace('/', '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['pair']),
                    High: convertToNumber(item["high"]),
                    Low: convertToNumber(item["low"]),
                    Sell: convertToNumber(item["ask"]),
                    Buy: convertToNumber(item["bid"]),
                    Last: convertToNumber(item["last"]),
                    Open: convertToNumber(item["open"]),
                    Volume: convertToNumber(item["volume"]),
                    QuoteVolume: null,
                    Time: convertToNumber(item["timestamp"]),
                    Info: item
                };
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }
    }

    // Crypto
    class Crypto {
        constructor() {
            this.spot_markets_url = "https://api.crypto.com/exchange/v1/public/get-instruments";
            this.swap_markets_url = "https://api.crypto.com/exchange/v1/public/get-instruments";
            this.future_markets_url = "https://api.crypto.com/exchange/v1/public/get-instruments";
            this.spot_tickers_url = "https://api.crypto.com/exchange/v1/public/get-tickers";
            this.swap_tickers_url = "https://api.crypto.com/exchange/v1/public/get-tickers";
            this.future_tickers_url = "https://api.crypto.com/exchange/v1/public/get-tickers";
            this.spot_klines_url = "https://api.crypto.com/exchange/v1/public/get-candlestick";
            this.swap_klines_url = "https://api.crypto.com/exchange/v1/public/get-candlestick";
            this.future_klines_url = "https://api.crypto.com/exchange/v1/public/get-candlestick";
        }

        parseMarketsData(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["result"]["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item["inst_type"] !== symbolType) {
                    continue;
                }
                let BaseAsset = String(item['base_ccy']).toLowerCase();
                let QuoteAsset = String(item['quote_ccy']).toLowerCase();
                let Symbol = null;
                let CtVal = null;
                let CtValCcy = null;
                let Contract = null;
                if (symbolType === 'CCY_PAIR') {
                    Symbol = BaseAsset + '_' + QuoteAsset;
                }
                else if (symbolType === 'PERPETUAL_SWAP') {
                    Contract = 'swap';
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                    if (QuoteAsset === 'usd') {
                        CtVal = convertToNumber(item["contract_size"]);
                        CtValCcy = QuoteAsset;
                    }
                }
                else {
                    let _symbol = String(item['symbol']);
                    Contract = _symbol.split('-')[1];
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                    if (QuoteAsset === 'usd') {
                        CtVal = convertToNumber(item["contract_size"]);
                        CtValCcy = QuoteAsset;
                    }
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: Contract,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item["price_tick_size"]),
                    AmountSize: convertToNumber(item["qty_tick_size"]),
                    PricePrecision: convertToNumber(item["quote_decimals"]),
                    AmountPrecision: convertToNumber(item["quantity_decimals"]),
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: CtVal,
                    CtValCcy: CtValCcy,
                    Info: item
                };
            }
        }

        parseTickersData(response, symbolObject, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["result"]["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let _symbol = String(item["i"]);
                if (!(_symbol in symbolObject)) {
                    continue;
                }
                let Symbol = symbolObject[_symbol];
                let Last = convertToNumber(item["a"]);
                let change = convertToNumber(item["c"]);
                let Open = convertToNumber((Last * (1 - change)).toFixed(countDecimalPlaces(Last)));
                let High = convertToNumber(item["h"]);
                let Low = convertToNumber(item["l"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['i']),
                    High: High,
                    Low: Low,
                    Sell: convertToNumber(item["k"]),
                    Buy: convertToNumber(item["b"]),
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["v"]),
                    QuoteVolume: convertToNumber(item["vv"]),
                    Time: convertToNumber(item["t"]),
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 300) {
                    limit = 300;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = 'M1';
            }
            else if (interval === '15m') {
                _interval = 'M15';
            }
            else {
                _interval = '1d';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?instrument_name=${alias}&timeframe=${_interval}&count=${limit}`;
            }
            else {
                if (interval === '1m') {
                    begin += 60000;
                }
                else if (interval === '15m') {
                    begin += 900000;
                }
                else {
                    begin += 86400000;
                }
                url = `${base_url}?instrument_name=${alias}&timeframe=${_interval}&count=${limit}&end_ts=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let result = response['result'];
                if (Object.prototype.toString.call(result) !== '[object Object]') {
                    return
                }
                let dataArray = result['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['t']), convertToNumber(item['o']), convertToNumber(item['h']),
                        convertToNumber(item['l']), convertToNumber(item['c']), convertToNumber(item['v'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, "CCY_PAIR", newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData(response, "PERPETUAL_SWAP", newDataObject);
            return newDataObject
        }

        // Markets FUTURES(交割合约)
        getMarketsFuture() {
            let newDataObject = {};
            let response = jsonFetch(this.future_markets_url);
            this.parseMarketsData(response, "FUTURE", newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let symbolObject = {};
            let markets_response = jsonFetch(this.spot_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            let dataArray = markets_response["result"]["data"];
            if (!Array.isArray(dataArray)) {
                return newDataObject
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item["inst_type"] === "CCY_PAIR") {
                    let BaseAsset = String(item['base_ccy']).toLowerCase();
                    let QuoteAsset = String(item['quote_ccy']).toLowerCase();
                    let _symbol = String(item['symbol']);
                    symbolObject[_symbol] = BaseAsset + '_' + QuoteAsset;
                }
            }
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, symbolObject, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let symbolObject = {};
            let markets_response = jsonFetch(this.swap_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            let dataArray = markets_response["result"]["data"];
            if (!Array.isArray(dataArray)) {
                return newDataObject
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item["inst_type"] === "PERPETUAL_SWAP") {
                    let BaseAsset = String(item['base_ccy']).toLowerCase();
                    let QuoteAsset = String(item['quote_ccy']).toLowerCase();
                    let _symbol = String(item['symbol']);
                    symbolObject[_symbol] = BaseAsset + '_' + QuoteAsset + '.swap';
                }
            }
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData(response, symbolObject, newDataObject);
            return newDataObject
        }

        // Tickers FUTURES(交割合约)
        getTickersFuture() {
            let newDataObject = {};
            let symbolObject = {};
            let markets_response = jsonFetch(this.future_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            let dataArray = markets_response["result"]["data"];
            if (!Array.isArray(dataArray)) {
                return newDataObject
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item["inst_type"] === "FUTURE") {
                    let Contract = _symbol.split('-')[1];
                    let BaseAsset = String(item['base_ccy']).toLowerCase();
                    let QuoteAsset = String(item['quote_ccy']).toLowerCase();
                    let _symbol = String(item['symbol']);
                    symbolObject[_symbol] = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                }
            }
            let response = jsonFetch(this.future_tickers_url);
            this.parseTickersData(response, symbolObject, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 10, _symbol, alias, interval = '1d', begin = null, limit = 300) {
            let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 10, _symbol, alias, interval = '1d', begin = null, limit = 300) {
            let klineArray = this.parseKlinesData(this.swap_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(交割合约)
        fetchKlinesFuture(sleep = 10, _symbol, alias, interval = '1d', begin = null, limit = 300) {
            let klineArray = this.parseKlinesData(this.future_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray   
        }
    }

    // BinanceTr
    class BinanceTr {
        constructor() {
            this.spot_markets_url = "https://www.trbinance.com/open/v1/common/symbols";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"]["list"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let TickSize = null;
                let AmountSize = null;
                let PricePrecision = null;
                let AmountPrecision = null;
                let MinQty = null;
                let MaxQty = null;
                let MinNotional = null;
                let MaxNotional = null;
                let CtVal = null;
                let filters = item['filters'];
                for (let j = 0; j < filters.length; j++) {
                    let temp_item = filters[j];
                    let filter_type = temp_item['filterType'];
                    if (filter_type == "PRICE_FILTER") {
                        TickSize = convertToNumber(temp_item['tickSize']);
                        PricePrecision = countDecimalPlaces(temp_item['tickSize']);
                    }
                    else if (filter_type == "LOT_SIZE") {
                        AmountSize = convertToNumber(temp_item['stepSize']);
                        AmountPrecision = countDecimalPlaces(temp_item['stepSize']);
                        MinQty = convertToNumber(temp_item['minQty']);
                        MaxQty = convertToNumber(temp_item['maxQty']);
                    }
                    else if (filter_type == "NOTIONAL") {
                        MinNotional = convertToNumber(temp_item['minNotional']);
                        MaxNotional = convertToNumber(temp_item['maxNotional']);
                    }
                }
                let BaseAsset = String(item["baseAsset"]).toLowerCase();
                let QuoteAsset = String(item["quoteAsset"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: TickSize,
                    AmountSize: AmountSize,
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: MinQty,
                    MaxQty: MaxQty,
                    MinNotional: MinNotional,
                    MaxNotional: MaxNotional,
                    CtVal: CtVal,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }
    }

    // Gemini
    class Gemini {
        constructor() {
            this.spot_markets_url = "https://api.gemini.com/v1/symbols/details/all";
            this.swap_markets_url = "https://api.gemini.com/v1/symbols/details/all";
            this.spot_tickers_url = "https://api.gemini.com/v2/ticker";
            this.swap_tickers_url = "https://api.gemini.com/v2/ticker";
            this.spot_klines_url = "https://api.gemini.com/v2/candles";
            this.swap_klines_url = "https://api.gemini.com/v2/derivatives/candles";
        }

        parseMarketsData(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                if (item["product_type"].toLowerCase() !== symbolType || item["status"] !== 'open') {
                    continue;
                }
                let Symbol = null;
                let Contract = null;
                let BaseAsset = String(item["base_currency"]).toLowerCase();
                let QuoteAsset = String(item["quote_currency"]).toLowerCase();
                if (symbolType === 'spot') {
                    Symbol = BaseAsset + '_' + QuoteAsset;
                }
                else {
                    Contract = 'swap';
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: Contract,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item["tick_size"]),
                    AmountSize: convertToNumber(item["quote_increment"]),
                    PricePrecision: countDecimalPlaces(item["tick_size"]),
                    AmountPrecision: countDecimalPlaces(item["quote_increment"]),
                    MinQty: convertToNumber(item["min_order_size"]),
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, _symbol, newDataObject) {
            if (response === null) {
                return
            }
            try {
                newDataObject[_symbol] = {
                    Symbol: _symbol,
                    Alias: String(response['symbol']),
                    High: convertToNumber(response["high"]),
                    Low: convertToNumber(response["low"]),
                    Sell: convertToNumber(response["ask"]),
                    Buy: convertToNumber(response["bid"]),
                    Last: convertToNumber(response["close"]),
                    Open: convertToNumber(response["open"]),
                    Volume: null,
                    QuoteVolume: null,
                    Time: null,
                    Info: response
                };
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name}  Method: parseTickersData  Symbol: ${_symbol}`, String(error));
            }
        }

        parseKlinesData1(base_url, _symbol, alias, interval, begin, limit) {
            let _interval = null;
            let reverse = null;
            if (interval === '1m') {
                _interval = '1m';
                reverse = true;
            }
            else if (interval === '15m') {
                _interval = '15m';
                reverse = true;
            }
            else {
                _interval = '1day';
                reverse = false;
            }

            let url = `${base_url}/${alias}/${_interval}`;

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                if (reverse === true) {
                    response.reverse();
                }
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesData2(base_url, _symbol, alias, interval, begin, limit) {
            let _interval = null;
            if (interval === '1m') {
                _interval = '1m';
            }
            else if (interval === '15m') {
                _interval = '1m';
            }
            else {
                return
            }

            let url = `${base_url}/${alias}/${_interval}`;

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                response.reverse();
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[5])]);
                }
                if (interval === '15m') {
                    return createrKline(klineArray, interval)
                }
                else {
                    return klineArray
                }
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, "spot", newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData(response, "swap", newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let markets_response = jsonFetch(this.spot_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            if (!Array.isArray(markets_response)) {
                return newDataObject
            }
            for (let i = 0; i < markets_response.length; i++) {
                let item = markets_response[i];
                let BaseAsset = String(item["base_currency"]).toLowerCase();
                let QuoteAsset = String(item["quote_currency"]).toLowerCase();
                let _symbol = BaseAsset + '_' + QuoteAsset;
                if (item["product_type"].toLowerCase() === "spot" && item["status"] === 'open') {
                    let response = jsonFetch(this.spot_tickers_url + "/" + item["symbol"]);
                    response["symbol"] = item["symbol"]
                    this.parseTickersData(response, _symbol, newDataObject);
                }
                Sleep(500);
            }
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let markets_response = jsonFetch(this.swap_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            if (!Array.isArray(markets_response)) {
                return newDataObject
            }
            for (let i = 0; i < markets_response.length; i++) {
                let item = markets_response[i];
                let BaseAsset = String(item["base_currency"]).toLowerCase();
                let QuoteAsset = String(item["quote_currency"]).toLowerCase();
                let _symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                if (item["product_type"].toLowerCase() === "swap" && item["status"] === 'open') {
                    let response = jsonFetch(this.swap_tickers_url + "/" + item["symbol"]);
                    response["symbol"] = item["symbol"]
                    this.parseTickersData(response, _symbol, newDataObject);
                }
                Sleep(500);
            }
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 500, _symbol, alias, interval = '1d', begin = null, limit = null) {
            let klineArray = this.parseKlinesData1(this.spot_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 500, _symbol, alias, interval = '1m', begin = null, limit = null) {
            let klineArray = this.parseKlinesData2(this.swap_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }
    }

    // BinanceUs
    class BinanceUs {
        constructor() {
            this.spot_markets_url = "https://api.binance.us/api/v3/exchangeInfo";
            this.spot_tickers_url = "https://api.binance.us/api/v3/ticker/24hr";
            this.spot_klines_url = "https://api.binance.us/api/v3/klines";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["symbols"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item['status'] === 'BREAK') {
                    continue;
                }
                let TickSize = null;
                let AmountSize = null;
                let PricePrecision = null;
                let AmountPrecision = null;
                let MinQty = null;
                let MaxQty = null;
                let MinNotional = null;
                let MaxNotional = null;
                let CtVal = null;
                let filters = item['filters'];
                for (let j = 0; j < filters.length; j++) {
                    let temp_item = filters[j];
                    let filter_type = temp_item['filterType'];
                    if (filter_type == "PRICE_FILTER") {
                        TickSize = convertToNumber(temp_item['tickSize']);
                        PricePrecision = countDecimalPlaces(temp_item['tickSize']);
                    }
                    else if (filter_type == "LOT_SIZE") {
                        AmountSize = convertToNumber(temp_item['stepSize']);
                        AmountPrecision = countDecimalPlaces(temp_item['stepSize']);
                        MinQty = convertToNumber(temp_item['minQty']);
                        MaxQty = convertToNumber(temp_item['maxQty']);
                    }
                    else if (filter_type == "MIN_NOTIONAL") {
                        MinNotional = convertToNumber(temp_item['minNotional']);
                        MaxNotional = convertToNumber(temp_item['maxNotional']);
                    }
                }
                let BaseAsset = String(item["baseAsset"]).toLowerCase();
                let QuoteAsset = String(item["quoteAsset"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: TickSize,
                    AmountSize: AmountSize,
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: MinQty,
                    MaxQty: MaxQty,
                    MinNotional: MinNotional,
                    MaxNotional: MaxNotional,
                    CtVal: CtVal,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, symbolObject, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let _symbol = String(item["symbol"]);
                if (!(_symbol in symbolObject)) {
                    continue;
                }
                let Symbol = symbolObject[_symbol];
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    High: convertToNumber(item["highPrice"]),
                    Low: convertToNumber(item["lowPrice"]),
                    Sell: convertToNumber(item["askPrice"]),
                    Buy: convertToNumber(item["bidPrice"]),
                    Last: convertToNumber(item["lastPrice"]),
                    Open: convertToNumber(item["openPrice"]),
                    Volume: convertToNumber(item["volume"]),
                    QuoteVolume: convertToNumber(item["quoteVolume"]),
                    Time: convertToNumber(item["closeTime"]),
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1000) {
                    limit = 1000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = '1m';
                endBegin = begin + (limit - 1) * 60000;
            }
            else if (interval === '15m') {
                _interval = '15m';
                endBegin = begin + (limit - 1) * 900000;
            }
            else {
                _interval = '1d';
                endBegin = begin + (limit - 1) * 86400000;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&interval=${_interval}&limit=${limit}`;
            }
            else {
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?symbol=${alias}&interval=${_interval}&limit=${limit}&startTime=${begin}&endTime=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let symbolObject = {};
            let markets_response = jsonFetch(this.spot_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            let dataArray = markets_response["symbols"];
            if (!Array.isArray(dataArray)) {
                return newDataObject
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item['status'] === 'BREAK') {
                    continue;
                }
                let _symbol = String(item['symbol']);
                let BaseAsset = String(item["baseAsset"]).toLowerCase();
                let QuoteAsset = String(item["quoteAsset"]).toLowerCase();
                symbolObject[_symbol] = BaseAsset + '_' + QuoteAsset;
            }
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, symbolObject, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 50, _symbol, alias, interval = '1d', begin = 1567267200000, limit = 1000) {
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // Tokocrypto
    class Tokocrypto {
        constructor() {
            this.spot_markets_url = "https://www.tokocrypto.com/open/v1/common/symbols";
            this.spot_1_klines_url = "https://api.binance.com/api/v1/klines";
            this.spot_3_klines_url = "https://cloudme-toko.2meta.app/api/v1/klines";
            this.symbolObject = {};
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"]["list"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let TickSize = null;
                let AmountSize = null;
                let PricePrecision = null;
                let AmountPrecision = null;
                let MinQty = null;
                let MaxQty = null;
                let MinNotional = null;
                let MaxNotional = null;
                let CtVal = null;
                let filters = item['filters'];
                for (let j = 0; j < filters.length; j++) {
                    let temp_item = filters[j];
                    let filter_type = temp_item['filterType'];
                    if (filter_type == "PRICE_FILTER") {
                        TickSize = convertToNumber(temp_item['tickSize']);
                        PricePrecision = countDecimalPlaces(temp_item['tickSize']);
                    }
                    else if (filter_type == "LOT_SIZE") {
                        AmountSize = convertToNumber(temp_item['stepSize']);
                        AmountPrecision = countDecimalPlaces(temp_item['stepSize']);
                        MinQty = convertToNumber(temp_item['minQty']);
                        MaxQty = convertToNumber(temp_item['maxQty']);
                    }
                    else if (filter_type == "NOTIONAL") {
                        MinNotional = convertToNumber(temp_item['minNotional']);
                        MaxNotional = convertToNumber(temp_item['maxNotional']);
                    }
                }
                let BaseAsset = String(item["baseAsset"]).toLowerCase();
                let QuoteAsset = String(item["quoteAsset"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: TickSize,
                    AmountSize: AmountSize,
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: MinQty,
                    MaxQty: MaxQty,
                    MinNotional: MinNotional,
                    MaxNotional: MaxNotional,
                    CtVal: CtVal,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1000) {
                    limit = 1000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = '1m';
                endBegin = begin + (limit - 1) * 60000;
            }
            else if (interval === '15m') {
                _interval = '15m';
                endBegin = begin + (limit - 1) * 900000;
            }
            else {
                _interval = '1d';
                endBegin = begin + (limit - 1) * 86400000;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias.replace('_', '')}&interval=${_interval}&limit=${limit}`;
            }
            else {
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?symbol=${alias.replace('_', '')}&interval=${_interval}&limit=${limit}&startTime=${begin}&endTime=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 50, _symbol, alias, interval = '1d', begin = 1501516800000, limit = 1000) {
            if (Object.keys(this.symbolObject).length === 0) {
                let response = jsonFetch(this.spot_markets_url);
                if (response === null) {
                    return
                }
                let dataArray = response["data"]["list"];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    let _symbol = String(item["symbol"]);
                    this.symbolObject[_symbol] = item["type"];
                }
            }
            let spot_klines_url = null;
            if (this.symbolObject[alias] === 1 || this.symbolObject[alias] === '1') {
                spot_klines_url = this.spot_1_klines_url;
            }
            else {
                spot_klines_url = this.spot_3_klines_url;
            }
            while (true) {
                let klineArray = this.parseKlinesData(spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // BingX
    class BingX {
        constructor() {
            this.spot_markets_url = "https://open-api.bingx.com/openApi/spot/v1/common/symbols?timestamp=";
            this.swap_markets_url = "https://open-api.bingx.com/openApi/swap/v2/quote/contracts?timestamp=";
            this.spot_tickers_url = "https://open-api.bingx.com/openApi/spot/v1/ticker/24hr?timestamp=";
            this.swap_tickers_url = "https://open-api.bingx.com/openApi/swap/v2/quote/ticker?timestamp=";
            this.spot_klines_url = "https://open-api.bingx.com/openApi/spot/v2/market/kline";
            this.swap_klines_url = "https://open-api.bingx.com/openApi/swap/v3/quote/klines";
        }

        parseMarketsData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"]["symbols"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let status = item["status"];
                if (status !== 1) {
                    continue;
                }
                let Symbol = String(item["symbol"]).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: Symbol.split("_")[0],
                    QuoteAsset: Symbol.split("_")[1],
                    TickSize: convertToNumber(item["tickSize"]),
                    AmountSize: convertToNumber(item["stepSize"]),
                    PricePrecision: countDecimalPlaces(item["tickSize"]),
                    AmountPrecision: countDecimalPlaces(item["stepSize"]),
                    MinQty: convertToNumber(item["minQty"]),
                    MaxQty: convertToNumber(item["maxQty"]),
                    MinNotional: convertToNumber(item["minNotional"]),
                    MaxNotional: convertToNumber(item["maxNotional"]),
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseMarketsData2(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let status = item["status"];
                if (status !== 1) {
                    continue;
                }
                let BaseAsset = String(item["asset"]).toLowerCase();
                let QuoteAsset = String(item["currency"]).toLowerCase();
                let PricePrecision = convertToNumber(item["pricePrecision"]);
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: 'swap',
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: convertToNumber(item["size"]),
                    PricePrecision: PricePrecision,
                    AmountPrecision: convertToNumber(item["quantityPrecision"]),
                    MinQty: convertToNumber(item["tradeMinQuantity"]),
                    MaxQty: convertToNumber(item["tradeMaxQuantity"]),
                    MinNotional: convertToNumber(item["tradeMinUSDT"]),
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Symbol = null;
                if (symbolType === 'spot') {
                    Symbol = String(item["symbol"]).replace(/-/g, '_').toLowerCase();
                }
                else {
                    Symbol = String(item["symbol"]).replace(/-/g, '_').toLowerCase() + '.swap';
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    High: convertToNumber(item["highPrice"]),
                    Low: convertToNumber(item["lowPrice"]),
                    Sell: convertToNumber(item["askPrice"]),
                    Buy: convertToNumber(item["bidPrice"]),
                    Last: convertToNumber(item["lastPrice"]),
                    Open: convertToNumber(item["openPrice"]),
                    Volume: convertToNumber(item["volume"]),
                    QuoteVolume: convertToNumber(item["quoteVolume"]),
                    Time: convertToNumber(item["closeTime"]),
                    Info: item
                };
            }
        }

        parseKlinesData1(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1000) {
                    limit = 1000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = '1m';
                endBegin = begin + (limit - 1) * 60000;
                begin = null;
            }
            else if (interval === '15m') {
                _interval = '15m';
                endBegin = begin + (limit - 1) * 900000;
                begin = null;
            }
            else {
                _interval = '1d';
                endBegin = begin + (limit - 1) * 86400000;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&interval=${_interval}&limit=${limit}&timestamp=${Date.now()}`;
            }
            else {
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?symbol=${alias}&interval=${_interval}&limit=${limit}&startTime=${begin}&endTime=${endBegin}&timestamp=${Date.now()}`;
            }
            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let msg = response['msg'];
                if (msg === 'date of query is too wide.') {
                    return klineArray
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                dataArray.reverse();
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[7])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesData2(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1440) {
                    limit = 1440;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = '1m';
                endBegin = begin + (limit - 1) * 60000;
            }
            else if (interval === '15m') {
                _interval = '15m';
                endBegin = begin + (limit - 1) * 900000;
            }
            else {
                _interval = '1d';
                endBegin = begin + (limit - 1) * 86400000;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&interval=${_interval}&limit=${limit}&timestamp=${Date.now()}`;
            }
            else {
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?symbol=${alias}&interval=${_interval}&limit=${limit}&startTime=${begin}&endTime=${endBegin}&timestamp=${Date.now()}`;
            }
            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let msg = response['msg'];
                if (msg === 'date of query is too wide.') {
                    return klineArray
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                dataArray.reverse();
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['time']), convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['volume'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url + Date.now());
            this.parseMarketsData1(response, newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url + Date.now());
            this.parseMarketsData2(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url + Date.now());
            this.parseTickersData(response, 'spot', newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_tickers_url + Date.now());
            this.parseTickersData(response, 'swap', newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 100, _symbol, alias, interval = '1d', begin = 1661961600000, limit = 1000) {
            while (true) {
                let klineArray = this.parseKlinesData1(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 100, _symbol, alias, interval = '1d', begin = 1585670400000, limit = 1440) {
            while (true) {
                let klineArray = this.parseKlinesData2(this.swap_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // BitFlyer
    class BitFlyer {
        constructor() {
            this.spot_markets_urls = [
                "https://api.bitflyer.com/v1/getmarkets",
                "https://api.bitflyer.com/v1/getmarkets/usa",
                "https://api.bitflyer.com/v1/getmarkets/eu"
            ];
            this.swap_markets_urls = [
                "https://api.bitflyer.com/v1/getmarkets",
                "https://api.bitflyer.com/v1/getmarkets/usa",
                "https://api.bitflyer.com/v1/getmarkets/eu"
            ];
            this.spot_tickers_url = "https://api.bitflyer.com/v1/ticker?product_code=";
            this.swap_tickers_url = "https://api.bitflyer.com/v1/ticker?product_code=";
        }

        parseMarketsData(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let Symbol = null;
                let Contract = null;
                let BaseAsset = null;
                let QuoteAsset = null
                let marketType = item["market_type"].toLowerCase();
                if (marketType !== symbolType) {
                    continue;
                }
                let product_code = String(item["product_code"]).replace(/-/g, '_').toLowerCase();
                if (symbolType === 'spot') {
                    BaseAsset = product_code.split('_')[0];
                    QuoteAsset = product_code.split('_')[1];
                    Contract = null;
                    Symbol = BaseAsset + '_' + QuoteAsset;
                }
                else {
                    BaseAsset = product_code.split('_')[1];
                    QuoteAsset = product_code.split('_')[2];
                    Contract = 'swap';
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['product_code']),
                    Contract: Contract,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: null,
                    AmountSize: null,
                    PricePrecision: null,
                    AmountPrecision: null,
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, symbolType, _symbol, newDataObject) {
            if (response === null) {
                return
            }
            if (Object.prototype.toString.call(response) !== '[object Object]') {
                return
            }
            try {
                let Symbol = null;
                let date = new Date(response["timestamp"]);
                let timestamp = date.getTime();
                let product_code = String(response["product_code"]).toLowerCase();
                if (symbolType === 'spot') {
                    Symbol = product_code.split('_')[0] + '_' + product_code.split('_')[1];
                }
                else {
                    Symbol = product_code.split('_')[1] + '_' + product_code.split('_')[2] + '.swap';
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(response['product_code']),
                    High: null,
                    Low: null,
                    Sell: convertToNumber(response["best_bid"]),
                    Buy: convertToNumber(response["best_ask"]),
                    Last: convertToNumber(response["ltp"]),
                    Open: null,
                    Volume: convertToNumber(response["volume"]),
                    QuoteVolume: null,
                    Time: timestamp,
                    Info: response
                };
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name}  Method: parseTickersData  Symbol: ${_symbol}`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            this.spot_markets_urls.map(url => {
                let response = jsonFetch(url);
                this.parseMarketsData(response, 'spot', newDataObject);
            });
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            this.swap_markets_urls.map(url => {
                let response = jsonFetch(url);
                this.parseMarketsData(response, 'fx', newDataObject);
            });
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            this.spot_markets_urls.map(url => {
                let markets_response = jsonFetch(url);
                for (let i = 0; i < markets_response.length; i++) {
                    let item = markets_response[i];
                    if (item["market_type"].toLowerCase() === 'spot') {
                        let response = jsonFetch(this.spot_tickers_url + item["product_code"]);
                        this.parseTickersData(response, 'spot', item["product_code"], newDataObject);
                    }
                    Sleep(500);
                }
            });
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            this.swap_markets_urls.map(url => {
                let markets_response = jsonFetch(url);
                for (let i = 0; i < markets_response.length; i++) {
                    let item = markets_response[i];
                    if (item["market_type"].toLowerCase() === 'fx') {
                        let response = jsonFetch(this.swap_tickers_url + item["product_code"]);
                        this.parseTickersData(response, 'fx', item["product_code"], newDataObject);
                    }
                    Sleep(500);
                }
            });
            return newDataObject
        }
    }

    // LBank
    class LBank {
        constructor() {
            this.spot_markets_url = "https://api.lbank.info/v2/accuracy.do";
            this.swap_markets_url = "https://lbkperp.lbank.com/cfd/openApi/v1/pub/instrument?productGroup=SwapU";
            this.spot_tickers_url = "https://api.lbank.info/v2/ticker/24hr.do?symbol=all";
            this.swap_tickers_url = "https://lbkperp.lbank.com/cfd/openApi/v1/pub/marketData?productGroup=SwapU";
            this.spot_klines_url = "https://api.lbkex.com/v2/kline.do";
        }

        parseMarketsData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let PricePrecision = convertToNumber(item["priceAccuracy"]);
                let AmountPrecision = convertToNumber(item["quantityAccuracy"]);
                let Symbol = String(item["symbol"]).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: Symbol.split("_")[0],
                    QuoteAsset: Symbol.split("_")[1],
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item["minTranQua"]),
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseMarketsData2(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = String(item["baseCurrency"]).toLowerCase();
                let QuoteAsset = String(item["clearCurrency"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                let CtVal = null;
                let CtValCcy = null;
                if (QuoteAsset === 'usdt') {
                    CtVal = convertToNumber(item["volumeMultiple"]);
                    CtValCcy = BaseAsset;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: 'swap',
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item["priceTick"]),
                    AmountSize: convertToNumber(item["volumeTick"]),
                    PricePrecision: countDecimalPlaces(item["priceTick"]),
                    AmountPrecision: countDecimalPlaces(item["volumeTick"]),
                    MinQty: convertToNumber(item["minOrderVolume"]),
                    MaxQty: convertToNumber(item["maxOrderVolume"]),
                    MinNotional: convertToNumber(item["minOrderCost"]),
                    MaxNotional: null,
                    CtVal: CtVal,
                    CtValCcy: CtValCcy,
                    Info: item
                };
            }
        }

        parseTickersData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Symbol = String(item["symbol"]).replace(/-/g, '_').toLowerCase();
                let Last = convertToNumber(item["ticker"]["latest"]);
                let change = convertToNumber(item["ticker"]["change"]);
                let Open = convertToNumber(Last * (1 - change * 0.01)).toFixed(countDecimalPlaces(Last));
                let High = convertToNumber(item["ticker"]["high"]);
                let Low = convertToNumber(item["ticker"]["low"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    High: High,
                    Low: Low,
                    Sell: null,
                    Buy: null,
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["ticker"]["vol"]),
                    QuoteVolume: convertToNumber(item["ticker"]["turnover"]),
                    Time: convertToNumber(item["timestamp"]),
                    Info: item
                };
            }
        }

        parseTickersData2(response, symbolObject, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let _symbol = String(item['symbol']);
                if (!(_symbol in symbolObject)) {
                    continue;
                }
                let Symbol = symbolObject[_symbol];
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: _symbol,
                    High: convertToNumber(item["highestPrice"]),
                    Low: convertToNumber(item["lowestPrice"]),
                    Sell: null,
                    Buy: null,
                    Last: convertToNumber(item["lastPrice"]),
                    Open: convertToNumber(item["openPrice"]),
                    Volume: convertToNumber(item["volume"]),
                    QuoteVolume: convertToNumber(item["turnover"]),
                    Time: convertToNumber(item["nextFeeTime"]),
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }

            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 2000) {
                    limit = 2000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = 'minute1';
            }
            else if (interval === '15m') {
                _interval = 'minute15';
            }
            else {
                _interval = 'day1';
            }
            let url = null;
            if (begin === null) {
                return
            }
            else {
                url = `${base_url}?symbol=${alias}&type=${_interval}&size=${limit}&time=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item[0]) * 1000, convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData1(response, newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData2(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData1(response, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let symbolObject = {};
            let markets_response = jsonFetch(this.swap_markets_url);
            if (markets_response === null) {
                return
            }
            let dataArray = markets_response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = String(item["baseCurrency"]).toLowerCase();
                let QuoteAsset = String(item["clearCurrency"]).toLowerCase();
                let _symbol = String(item['symbol']);
                symbolObject[_symbol] = BaseAsset + '_' + QuoteAsset + '.swap';
            }
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData2(response, symbolObject, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 50, _symbol, alias, interval = '1d', begin = 1519833600000, limit = 2000) {
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // Bithumb
    class Bithumb {
        constructor() {
            this.spot_markets_url = "https://api.bithumb.com/v1/market/all";
            this.spot_tickers_url = "https://api.bithumb.com/v1/ticker?markets=";
            this.spot_klines_url = "https://api.bithumb.com/v1/candles";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let _symbol = String(item["market"]).replace(/-/g, '_').toLowerCase();
                let BaseAsset = _symbol.split('_')[1];
                let QuoteAsset = _symbol.split('_')[0];
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item["market"]),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: null,
                    AmountSize: null,
                    PricePrecision: null,
                    AmountPrecision: null,
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let _symbol = String(item["market"]).replace(/-/g, '_').toLowerCase();
                let BaseAsset = _symbol.split('_')[1];
                let QuoteAsset = _symbol.split('_')[0];
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item["market"]),
                    High: convertToNumber(item["high_price"]),
                    Low: convertToNumber(item["low_price"]),
                    Sell: null,
                    Buy: null,
                    Last: convertToNumber(item["trade_price"]),
                    Open: convertToNumber(item["opening_price"]),
                    Volume: convertToNumber(item["acc_trade_volume_24h"]),
                    QuoteVolume: convertToNumber(item["acc_trade_price_24h"]),
                    Time: convertToNumber(item["timestamp"]),
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 200) {
                    limit = 200;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = 'minutes/1';
            }
            else if (interval === '15m') {
                _interval = 'minutes/15';
            }
            else {
                _interval = 'days';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}/${_interval}?market=${alias}&count=${limit}`;
            }
            else {
                let date = new Date(begin); // 将时间戳转换为 Date 对象
                let kstOffset = 9 * 60; // 将时间转换为 KST (UTC+9)
                let kstDate = new Date(date.getTime() + kstOffset * 60 * 1000);
                let year = kstDate.getUTCFullYear();
                let month = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
                let day = String(kstDate.getUTCDate()).padStart(2, '0');
                let hours = String(kstDate.getUTCHours()).padStart(2, '0');
                let minutes = String(kstDate.getUTCMinutes()).padStart(2, '0');
                let seconds = String(kstDate.getUTCSeconds()).padStart(2, '0');
                let beginDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
                url = `${base_url}/${_interval}?market=${alias}&count=${limit}&to=${beginDate}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                response.reverse()
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(item['timestamp']), convertToNumber(item['opening_price']), convertToNumber(item['high_price']),
                        convertToNumber(item['low_price']), convertToNumber(item['trade_price']), convertToNumber(item['candle_acc_trade_volume'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let symbolArray = [];
            let markets_response = jsonFetch(this.spot_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            if (!Array.isArray(markets_response)) {
                return newDataObject
            }
            for (let i = 0; i < markets_response.length; i++) {
                let item = markets_response[i];
                let _symbol = String(item["market"]);
                symbolArray.push(_symbol);
            }
            let response = jsonFetch(this.spot_tickers_url + symbolArray.join(','));
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 10, _symbol, alias, interval = '1d', begin = null, limit = 200) {
            let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }
    }

    // XTCOM
    class XTCOM {
        constructor() {
            this.spot_markets_url = "https://sapi.xt.com/v4/public/symbol";
            this.swap_markets_urls = [
                "https://fapi.xt.com/future/market/v3/public/symbol/list",
                "https://dapi.xt.com/future/market/v3/public/symbol/list"
            ];
            this.future_markets_urls = [
                "https://fapi.xt.com/future/market/v3/public/symbol/list",
                "https://dapi.xt.com/future/market/v3/public/symbol/list"
            ];
            this.spot_tickers_url = "https://sapi.xt.com/v4/public/ticker";
            this.swap_tickers_urls = [
                "https://fapi.xt.com/future/market/v1/public/q/agg-tickers",
                "https://dapi.xt.com/future/market/v1/public/q/agg-tickers"
            ];
            this.future_tickers_urls = [
                "https://fapi.xt.com/future/market/v1/public/q/agg-tickers",
                "https://dapi.xt.com/future/market/v1/public/q/agg-tickers"
            ];
            this.spot_klines_url = "https://sapi.xt.com/v4/public/kline";
            this.u_swap_klines_url = "https://fapi.xt.com/future/market/v1/public/q/kline";
            this.b_swap_klines_url = "https://dapi.xt.com/future/market/v1/public/q/kline";
        }

        parseMarketsData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["result"]["symbols"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item['state'] !== "ONLINE") {
                    continue;
                }
                let MinQty = null;
                let MaxQty = null;
                let MinNotional = null;
                let MaxNotional = null;
                let filters = item['filters'];
                for (let j = 0; j < filters.length; j++) {
                    let temp_item = filters[j];
                    let filter_type = temp_item['filter'];
                    if (filter_type == "QUANTITY") {
                        MinQty = convertToNumber(temp_item['min']);
                        MaxQty = convertToNumber(temp_item['max']);
                    }
                    else if (filter_type == "QUOTE_QTY") {
                        MinNotional = convertToNumber(temp_item['min']);
                        MaxNotional = convertToNumber(temp_item['max']);
                    }
                }
                let PricePrecision = convertToNumber(item['pricePrecision']);
                let AmountPrecision = convertToNumber(item['quantityPrecision']);
                let BaseAsset = String(item["baseCurrency"]).toLowerCase();
                let QuoteAsset = String(item["quoteCurrency"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: MinQty,
                    MaxQty: MaxQty,
                    MinNotional: MinNotional,
                    MaxNotional: MaxNotional,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseMarketsData2(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["result"]["symbols"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item["productType"] !== 'perpetual') {
                    continue;
                }
                let AmountPrecision = convertToNumber(item["quantityPrecision"]);
                let BaseAsset = String(item["baseCoin"]).toLowerCase();
                let QuoteAsset = String(item["quoteCoin"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: 'swap',
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item["minStepPrice"]),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: convertToNumber(item["pricePrecision"]),
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item["minQty"]),
                    MaxQty: convertToNumber(item["maxQty"]),
                    MinNotional: convertToNumber(item["minNotional"]),
                    MaxNotional: convertToNumber(item["maxNotional"]),
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseMarketsData3(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["result"]["symbols"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item["productType"] !== 'futures') {
                    continue;
                }
                let Contract = '';
                let contractType = item["contractType"];
                if (contractType === 'CURRENT_QUARTER') {
                    Contract = 'this_quarter';
                }
                else if (contractType === 'NEXT_QUARTER') {
                    Contract = 'next_quarter';
                }
                else {
                    Contract = contractType.toLowerCase();
                }
                let BaseAsset = String(item["baseCoin"].toLowerCase());
                let QuoteAsset = String(item["quoteCoin"].toLowerCase());
                let Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                let AmountPrecision = convertToNumber(item["quantityPrecision"]);
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: Contract,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item["minStepPrice"]),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: convertToNumber(item["pricePrecision"]),
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item["minQty"]),
                    MaxQty: convertToNumber(item["maxQty"]),
                    MinNotional: convertToNumber(item["minNotional"]),
                    MaxNotional: convertToNumber(item["maxNotional"]),
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["result"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Symbol = String(item["s"]).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['s']),
                    High: convertToNumber(item["h"]),
                    Low: convertToNumber(item["l"]),
                    Sell: convertToNumber(item["bp"]),
                    Buy: convertToNumber(item["ap"]),
                    Last: convertToNumber(item["c"]),
                    Open: convertToNumber(item["o"]),
                    Volume: null,
                    QuoteVolume: convertToNumber(item["v"]),
                    Time: convertToNumber(item["t"]),
                    Info: item
                };
            }
        }

        parseTickersData2(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["result"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let _symbol = String(item["s"]).replace(/-/g, '_').toLowerCase();
                if (convertToNumber(_symbol.split("_")[2]) !== null) {
                    continue;
                }
                let Symbol = _symbol + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['s']),
                    High: convertToNumber(item["h"]),
                    Low: convertToNumber(item["l"]),
                    Sell: convertToNumber(item["bp"]),
                    Buy: convertToNumber(item["ap"]),
                    Last: convertToNumber(item["c"]),
                    Open: convertToNumber(item["o"]),
                    Volume: null,
                    QuoteVolume: convertToNumber(item["v"]),
                    Time: convertToNumber(item["t"]),
                    Info: item
                };
            }
        }

        parseTickersData3(response, symbolObject, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["result"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let _symbol = String(item["s"]).toLowerCase();
                if (!(_symbol in symbolObject)) {
                    continue;
                }
                let Symbol = symbolObject[_symbol];
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['s']),
                    High: convertToNumber(item["h"]),
                    Low: convertToNumber(item["l"]),
                    Sell: convertToNumber(item["bp"]),
                    Buy: convertToNumber(item["ap"]),
                    Last: convertToNumber(item["c"]),
                    Open: convertToNumber(item["o"]),
                    Volume: null,
                    QuoteVolume: convertToNumber(item["v"]),
                    Time: convertToNumber(item["t"]),
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1000) {
                    limit = 1000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = '1m';
                endBegin = begin + (limit - 1) * 60000;
            }
            else if (interval === '15m') {
                _interval = '15m';
                endBegin = begin + (limit - 1) * 900000;
            }
            else {
                _interval = '1d';
                endBegin = begin + (limit - 1) * 86400000;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&interval=${_interval}&limit=${limit}`;
            }
            else {
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?symbol=${alias}&interval=${_interval}&limit=${limit}&startTime=${begin}&endTime=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['result'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                dataArray.reverse();
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['t']), convertToNumber(item['o']), convertToNumber(item['h']),
                        convertToNumber(item['l']), convertToNumber(item['c']), convertToNumber(item['q'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData1(response, newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            this.swap_markets_urls.map(url => {
                let response = jsonFetch(url);
                this.parseMarketsData2(response, newDataObject);
            });
            return newDataObject
        }

        // Markets FUTURES(交割合约)
        getMarketsFuture() {
            let newDataObject = {};
            this.future_markets_urls.map(url => {
                let response = jsonFetch(url);
                this.parseMarketsData3(response, newDataObject);
            });
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData1(response, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            this.swap_tickers_urls.map(url => {
                let response = jsonFetch(url);
                this.parseTickersData2(response, newDataObject);
            });
            return newDataObject
        }

        // Tickers FUTURES(交割合约)
        getTickersFuture() {
            let newDataObject = {};
            let symbolObject = {};
            this.future_markets_urls.map(url => {
                let markets_response = jsonFetch(url);
                if (markets_response === null) {
                    return newDataObject
                }
                let dataArray = markets_response["result"]["symbols"];
                if (!Array.isArray(dataArray)) {
                    return newDataObject
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    let productType = item["productType"];
                    if (productType !== 'futures') {
                        continue;
                    }
                    let Contract = '';
                    let contractType = item["contractType"];
                    if (contractType === 'CURRENT_QUARTER') {
                        Contract = 'this_quarter';
                    }
                    else if (contractType === 'NEXT_QUARTER') {
                        Contract = 'next_quarter';
                    }
                    else {
                        Contract = contractType.toLowerCase();
                    }
                    let _symbol = String(item["symbol"]).toLowerCase();
                    let BaseAsset = String(item["baseCoin"].toLowerCase());
                    let QuoteAsset = String(item["quoteCoin"].toLowerCase());
                    symbolObject[_symbol] = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                }
            });
            this.future_tickers_urls.map(url => {
                let response = jsonFetch(url);
                this.parseTickersData3(response, symbolObject, newDataObject);
            });
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 50, _symbol, alias, interval = '1d', begin = 1530374400000, limit = 1000) {
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 100, _symbol, alias, interval = '1d', begin = 1567267200000, limit = 1000) {
            let swap_klines_url = null;
            if (alias.split('_')[1] === 'usdt') {
                swap_klines_url = this.u_swap_klines_url;
            }
            else {
                swap_klines_url = this.b_swap_klines_url;
            }
            while (true) {
                let klineArray = this.parseKlinesData(swap_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(交割合约)
        fetchKlinesFuture(sleep = 100, _symbol, alias, interval = '1d', begin = 1567267200000, limit = 1000) {
            let future_klines_url = null;
            if (alias.split('_')[1] === 'usdt') {
                future_klines_url = this.u_swap_klines_url;
            }
            else {
                future_klines_url = this.b_swap_klines_url;
            }
            while (true) {
                let klineArray = this.parseKlinesData(future_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // Deepcoin
    class Deepcoin {
        constructor() {
            this.spot_markets_url = "https://api.deepcoin.com/deepcoin/market/instruments?instType=SPOT";
            this.swap_markets_url = "https://api.deepcoin.com/deepcoin/market/instruments?instType=SWAP";
            this.spot_tickers_url = "https://api.deepcoin.com/deepcoin/market/tickers?instType=SPOT";
            this.swap_tickers_url = "https://api.deepcoin.com/deepcoin/market/tickers?instType=SWAP";
            this.spot_klines_url = "https://api.deepcoin.com/deepcoin/market/candles";
            this.swap_klines_url = "https://api.deepcoin.com/deepcoin/market/candles";
        }

        parseMarketsData(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Symbol = null;
                let Contract = null;
                let BaseAsset = String(item["baseCcy"]).toLowerCase();
                let QuoteAsset = String(item["quoteCcy"]).toLowerCase();
                if (symbolType === 'spot') {
                    Symbol = BaseAsset + '_' + QuoteAsset;
                }
                else {
                    Contract = 'swap';
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['instId']),
                    Contract: Contract,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item['tickSz']),
                    AmountSize: convertToNumber(item['lotSz']),
                    PricePrecision: countDecimalPlaces(item['tickSz']),
                    AmountPrecision: countDecimalPlaces(item['lotSz']),
                    MinQty: convertToNumber(item['minSz']),
                    MaxQty: convertToNumber(item['maxMktSz']),
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: convertToNumber(item['ctVal']),
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Symbol = null;
                if (symbolType === 'spot') {
                    Symbol = String(item["instId"]).replace(/-/g, '_').toLowerCase();
                }
                else {
                    Symbol = String(item["instId"]).replace(/-/g, '_').toLowerCase() + '.swap';
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['instId']),
                    High: convertToNumber(item["high24h"]),
                    Low: convertToNumber(item["low24h"]),
                    Sell: convertToNumber(item["askPx"]),
                    Buy: convertToNumber(item["bidPx"]),
                    Last: convertToNumber(item["last"]),
                    Open: convertToNumber(item["open24h"]),
                    Volume: convertToNumber(item["vol24h"]),
                    QuoteVolume: convertToNumber(item["volCcy24h"]),
                    Time: convertToNumber(item["ts"]),
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 300) {
                    limit = 300;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = '1m';
                endBegin = begin + (limit - 1) * 60000;
            }
            else if (interval === '15m') {
                _interval = '15m';
                endBegin = begin + (limit - 1) * 900000;
            }
            else {
                _interval = '1D';
                endBegin = begin + (limit - 1) * 86400000;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?instId=${alias}&bar=${_interval}&limit=${limit}`;
            }
            else {
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?instId=${alias}&bar=${_interval}&limit=${limit}&before=${begin}&after=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                dataArray.reverse();
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, 'spot', newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData(response, 'swap', newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, 'spot', newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData(response, 'swap', newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 200, _symbol, alias, interval = '1d', begin = 1593532800000, limit = 300) {
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 200, _symbol, alias, interval = '1d', begin = 1601481600000, limit = 300) {
            while (true) {
                let klineArray = this.parseKlinesData(this.swap_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // ProBit
    class ProBit {
        constructor() {
            this.spot_markets_url = "https://api.probit.com/api/exchange/v1/market";
            this.spot_tickers_url = "https://api.probit.com/api/exchange/v1/ticker";
            this.spot_klines_url = "https://api.probit.com/api/exchange/v1/candle";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let AmountPrecision = convertToNumber(item['quantity_precision']);
                let BaseAsset = String(item["base_currency_id"]).toLowerCase();
                let QuoteAsset = String(item["quote_currency_id"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['id']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item['price_increment']),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: countDecimalPlaces(item['price_increment']),
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item['min_quantity']),
                    MaxQty: convertToNumber(item['max_quantity']),
                    MinNotional: convertToNumber(item['min_cost']),
                    MaxNotional: convertToNumber(item['max_cost']),
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Last = convertToNumber(item["last"]);
                let Change = convertToNumber(item["change"]);
                let Open = convertToNumber((Last - Change).toFixed(countDecimalPlaces(Last)));
                let High = convertToNumber(item["high"]);
                let Low = convertToNumber(item["low"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                let Time = new Date(item["time"]).getTime();
                let Symbol = String(item["market_id"]).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['market_id']),
                    High: High,
                    Low: Low,
                    Sell: null,
                    Buy: null,
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["base_volume"]),
                    QuoteVolume: convertToNumber(item["quote_volume"]),
                    Time: Time,
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 4000) {
                    limit = 4000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = '1m';
                endBegin = begin + (limit - 1) * 60000;
            }
            else if (interval === '15m') {
                _interval = '15m';
                endBegin = begin + (limit - 1) * 900000;
            }
            else {
                _interval = '1D';
                endBegin = begin + (limit - 1) * 86400000;
            }
            let url = null;
            if (begin === null) {
                return
            }
            else {
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                let beginDate = new Date(begin);
                let endBeginDate = new Date(endBegin);
                url = `${base_url}?market_ids=${alias}&interval=${_interval}&limit=${limit}&start_time=${beginDate.toISOString()}&end_time=${endBeginDate.toISOString()}&sort=asc`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    let time = new Date(item['start_time']);
                    klineArray.push([_symbol, convertToNumber(time.getTime()), convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['base_volume'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 100, _symbol, alias, interval = '1d', begin = 1541001600000, limit = 4000) {
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // Coinw
    class Coinw {
        constructor() {
            this.spot_markets_url = "https://api.coinw.com/api/v1/public?command=returnSymbol";
            this.swap_markets_url = "https://api.coinw.com/v1/perpumPublic/tickers";
            this.spot_tickers_url = "https://api.coinw.com/api/v1/public?command=returnTicker";
            this.swap_tickers_url = "https://api.coinw.com/v1/perpumPublic/tickers";
            this.spot_klines_url = "https://api.coinw.com/api/v1/public";
            this.swap_klines_url = "https://api.coinw.com/v1/perpumPublic/klines";
        }

        parseMarketsData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let state = item["state"];
                if (state !== 1) {
                    continue;
                }
                let PricePrecision = convertToNumber(item['pricePrecision']);
                let AmountPrecision = convertToNumber(item['countPrecision']);
                let BaseAsset = String(item["currencyBase"]).toLowerCase();
                let QuoteAsset = String(item["currencyQuote"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['currencyPair']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item['minBuyCount']),
                    MaxQty: convertToNumber(item['maxBuyCount']),
                    MinNotional: convertToNumber(item['minBuyAmount']),
                    MaxNotional: convertToNumber(item['maxBuyAmount']),
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseMarketsData2(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = String(item["base_coin"]).toLowerCase();
                let QuoteAsset = String(item["quote_coin"]).toLowerCase();
                let CtValCcy = null;
                if (QuoteAsset === 'usdt') {
                    CtValCcy = BaseAsset;
                }
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['name']),
                    Contract: 'swap',
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: null,
                    AmountSize: null,
                    PricePrecision: null,
                    AmountPrecision: null,
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: convertToNumber(item['contract_size']),
                    CtValCcy: CtValCcy,
                    Info: item
                };
            }
        }

        parseTickersData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataObject = response["data"];
            if (Object.prototype.toString.call(dataObject) !== '[object Object]') {
                return
            }
            for (let _symbol in dataObject) {
                let item = dataObject[_symbol];
                let Last = convertToNumber(item["last"]);
                let Change = convertToNumber(item["percentChange"]);
                let Open = convertToNumber((Last - Change).toFixed(countDecimalPlaces(Last)));
                let High = convertToNumber(item["high24hr"]);
                let Low = convertToNumber(item["low24hr"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                let Symbol = String(_symbol).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(_symbol),
                    High: High,
                    Low: Low,
                    Sell: convertToNumber(item["lowestAsk"]),
                    Buy: convertToNumber(item["highestBid"]),
                    Last: Last,
                    Open: Open,
                    Volume: null,
                    QuoteVolume: convertToNumber(item["baseVolume"]),
                    Time: null,
                    Info: item
                };
            }
        }

        parseTickersData2(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = String(item["base_coin"]).toLowerCase();
                let QuoteAsset = String(item["quote_coin"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                let Last = convertToNumber(item["last_price"]);
                let rise_fall_rate = convertToNumber(item["rise_fall_rate"]);
                let Open = convertToNumber(Last * (1 - rise_fall_rate)).toFixed(countDecimalPlaces(Last));
                let High = convertToNumber(item["high"]);
                let Low = convertToNumber(item["low"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item["name"]),
                    High: High,
                    Low: Low,
                    Sell: null,
                    Buy: null,
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["total_volume"]),
                    QuoteVolume: null,
                    Time: null,
                    Info: item
                };
            }
        }

        parseKlinesData1(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1000) {
                    limit = 1000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = 60;
            }
            else if (interval === '15m') {
                _interval = 900;
            }
            else {
                _interval = 14400;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?currencyPair=${alias}&command=returnChartData&period=${_interval}`;
            }
            else {
                if (interval === '1m') {
                    begin += 60000;
                }
                else if (interval === '15m') {
                    begin += 900000;
                }
                else {
                    begin += 14400000 * 10;
                }
                url = `${base_url}?currencyPair=${alias}&command=returnChartData&period=${_interval}&end=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (dataArray === null) {
                    return klineArray
                }
                if (!Array.isArray(dataArray)) {
                    return
                }
                dataArray.reverse();
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['date']), convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['volume'])]);
                }
                if (interval === '1d') {
                    return createrKline(klineArray, interval)
                }
                else {
                    return klineArray
                }
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesData2(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 300) {
                    limit = 300;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = 0;
            }
            else if (interval === '15m') {
                _interval = 2;
            }
            else {
                _interval = 5;
            }
            let url = `${base_url}?currencyCode=${_symbol.split('_')[0]}&granularity=${_interval}&limit=${limit}`;

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (dataArray === null) {
                    return klineArray
                }
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData1(response, newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData2(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData1(response, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData2(response, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 50, _symbol, alias, interval = '1d', begin = null, limit = 1000) {
            let klineArray = this.parseKlinesData1(this.spot_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 50, _symbol, alias, interval = '1d', begin = null, limit = 300) {
            let klineArray = this.parseKlinesData2(this.swap_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }
    }

    // P2B
    class P2B {
        constructor() {
            this.spot_markets_url = "https://api.p2pb2b.com/api/v2/public/markets";
            this.spot_tickers_url = "https://api.p2pb2b.com/api/v2/public/tickers";
            this.spot_klines_url = "https://api.p2pb2b.com/api/v2/public/market/kline";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["result"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = String(item["stock"]).toLowerCase();
                let QuoteAsset = String(item["money"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['name']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item['limits']['tick_size']),
                    AmountSize: convertToNumber(item['limits']['step_size']),
                    PricePrecision: convertToNumber(item['precision']['money']),
                    AmountPrecision: convertToNumber(item['precision']['stock']),
                    MinQty: convertToNumber(item['limits']['min_amount']),
                    MaxQty: convertToNumber(item['limits']['max_amount']),
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataObject = response["result"];
            if (Object.prototype.toString.call(dataObject) !== '[object Object]') {
                return
            }
            for (let _symbol in dataObject) {
                let item = dataObject[_symbol];
                let Last = convertToNumber(item["ticker"]["last"]);
                let change = item["ticker"]["change"];
                let Open = convertToNumber((Last * (1 - change * 0.01)).toFixed(countDecimalPlaces(Last)));
                let High = convertToNumber(item["ticker"]["high"]);
                let Low = convertToNumber(item["ticker"]["low"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                let Symbol = String(_symbol).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(_symbol),
                    High: High,
                    Low: Low,
                    Sell: convertToNumber(item["ticker"]["ask"]),
                    Buy: convertToNumber(item["ticker"]["bid"]),
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["ticker"]["vol"]),
                    QuoteVolume: convertToNumber(item["ticker"]["deal"]),
                    Time: convertToNumber(item["at"]),
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }

            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 500) {
                    limit = 500;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let date_now = Math.floor(Date.now() / 1000);
            let _interval = null;
            let endBegin = null;
            let offset = null;
            if (interval === '1m') {
                _interval = '1m';
                endBegin = begin + (limit - 1) * 60;
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                offset = Math.floor((date_now - endBegin) / 60);
            }
            else if (interval === '15m') {
                return
            }
            else {
                _interval = '1d';
                endBegin = begin + (limit - 1) * 86400;
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                offset = Math.floor((date_now - endBegin) / 86400);
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?market=${alias}&interval=${_interval}&limit=${limit}`;
            }
            else {
                url = `${base_url}?market=${alias}&interval=${_interval}&limit=${limit}&offset=${offset}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['result'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item[0]) * 1000, convertToNumber(item[1]), convertToNumber(item[3]),
                        convertToNumber(item[4]), convertToNumber(item[2]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 100, _symbol, alias, interval = '1d', begin = 1530374400000, limit = 500) {
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // BitMart
    class BitMart {
        constructor() {
            this.spot_markets_url = "https://api-cloud.bitmart.com/spot/v1/symbols/details";
            this.swap_markets_url = "https://api-cloud.bitmart.com/contract/public/details";
            this.spot_tickers_url = "https://api-cloud.bitmart.com/spot/quotation/v3/tickers";
            this.swap_tickers_url = "https://api-cloud.bitmart.com/contract/public/details";
            this.spot_klines_url = "https://api-cloud.bitmart.com/spot/quotation/v3/klines";
            this.swap_klines_url = "https://api-cloud.bitmart.com/contract/public/kline";
        }

        parseMarketsData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"]["symbols"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let trade_status = item["trade_status"];
                if (trade_status !== 'trading') {
                    continue;
                }
                let PricePrecision = convertToNumber(item['price_max_precision']);
                let MinNotional = convertToNumber(Math.max(item['min_buy_amount'], item['min_sell_amount']));
                let BaseAsset = String(item["base_currency"]).toLowerCase();
                let QuoteAsset = String(item["quote_currency"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: convertToNumber(item['base_min_size']),
                    PricePrecision: PricePrecision,
                    AmountPrecision: countDecimalPlaces(item['base_min_size']),
                    MinQty: convertToNumber(item['base_min_size']),
                    MaxQty: convertToNumber(item['base_max_size']),
                    MinNotional: MinNotional,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseMarketsData2(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"]["symbols"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = String(item["base_currency"]).toLowerCase();
                let QuoteAsset = String(item["quote_currency"]).toLowerCase();
                let CtValCcy = null;
                if (QuoteAsset === 'usd') {
                    CtValCcy = QuoteAsset;
                }
                else if (QuoteAsset === 'usdt') {
                    CtValCcy = BaseAsset;
                }
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: 'swap',
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item['price_precision']),
                    AmountSize: convertToNumber(item['vol_precision']),
                    PricePrecision: countDecimalPlaces(item['price_precision']),
                    AmountPrecision: countDecimalPlaces(item['vol_precision']),
                    MinQty: convertToNumber(item['min_volume']),
                    MaxQty: convertToNumber(item['max_volume']),
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: convertToNumber(item['contract_size']),
                    CtValCcy: CtValCcy,
                    Info: item
                };
            }
        }

        parseTickersData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Symbol = String(item[0]).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item[item[0]]),
                    High: convertToNumber(item[5]),
                    Low: convertToNumber(item[6]),
                    Sell: convertToNumber(item[10]),
                    Buy: convertToNumber(item[8]),
                    Last: convertToNumber(item[1]),
                    Open: convertToNumber(item[4]),
                    Volume: convertToNumber(item[2]),
                    QuoteVolume: convertToNumber(item[3]),
                    Time: convertToNumber(item[12]),
                    Info: item
                };
            }
        }

        parseTickersData2(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"]["symbols"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Last = convertToNumber(item["last_price"]);
                let Change = convertToNumber(item["change_24h"]);
                let Open = convertToNumber((Last - Change).toFixed(countDecimalPlaces(Last)));
                let High = convertToNumber(item["high_24h"]);
                let Low = convertToNumber(item["low_24h"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                let baseAsset = String(item["base_currency"]).toLowerCase();
                let quoteAsset = String(item["quote_currency"]).toLowerCase();
                let Symbol = baseAsset + '_' + quoteAsset + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item["symbol"]),
                    High: High,
                    Low: Low,
                    Sell: null,
                    Buy: null,
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["volume_24h"]),
                    QuoteVolume: convertToNumber(item["turnover_24h"]),
                    Time: convertToNumber(item["open_timestamp"]),
                    Info: item
                };
            }
        }

        parseKlinesData1(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }

            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 200) {
                    limit = 200;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = 1;
            }
            else if (interval === '15m') {
                _interval = 15;
            }
            else {
                _interval = 1440;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&step=${_interval}&limit=${limit}`;
            }
            else {
                url = `${base_url}?symbol=${alias}&step=${_interval}&limit=${limit}&after=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let message = response['message'];
                if (message === 'no data') {
                    return klineArray
                }
                if (message.includes('Request too many requests')) {
                    return 
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item[0]) * 1000, convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesData2(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }

            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 500) {
                    limit = 500;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = 1;
            }
            else if (interval === '15m') {
                _interval = 15;
            }
            else {
                _interval = 1440;
            }
            let url = null;
            if (begin === null) {
                return
            }
            else {
                if (interval === '1m') {
                    endBegin = begin + (limit - 1) * 60;
                }
                else if (interval === '15m') {
                    endBegin = begin + (limit - 1) * 900;
                }
                else {
                    endBegin = begin + (limit - 1) * 86400;
                }
                let date_now = Math.floor(Date.now() / 1000);
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?symbol=${alias}&step=${_interval}&start_time=${begin}&end_time=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let message = response['message'];
                if (message === 'no data') {
                    return klineArray
                }
                if (message.includes('Request too many requests')) {
                    return 
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['timestamp']) * 1000, convertToNumber(item['open_price']), convertToNumber(item['high_price']),
                        convertToNumber(item['low_price']), convertToNumber(item['close_price']), convertToNumber(item['volume'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData1(response, newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData2(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData1(response, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData2(response, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 200, _symbol, alias, interval = '1d', begin = 1501516800000, limit = 200) {
            while (true) {
                let klineArray = this.parseKlinesData1(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 200, _symbol, alias, interval = '1d', begin = 1622476800000, limit = 500) {
            while (true) {
                let klineArray = this.parseKlinesData2(this.swap_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // OrangeX
    class OrangeX {
        constructor() {
            this.spot_markets_url = "https://api.orangex.com/api/v1/public/get_instruments";
            this.swap_markets_url = "https://api.orangex.com/api/v1/public/get_instruments";
            this.spot_tickers_url = "https://api.orangex.com/api/v1/public/cmc_spot_summary";
            this.swap_tickers_url = "https://api.orangex.com/api/v1/public/coin_gecko_contracts";
            this.spot_klines_url = "https://api.orangex.com/api/v1/public/get_tradingview_chart_data";
            this.swap_klines_url = "https://api.orangex.com/api/v1/public/get_tradingview_chart_data";
        }

        parseMarketsData(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["result"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item["currency"].toLowerCase() !== symbolType) {
                    continue;
                }
                let is_active = item["is_active"];
                if (is_active !== true) {
                    continue;
                }
                let Symbol = null;
                let Contract = null;
                let BaseAsset = String(item["quote_currency"]).toLowerCase();
                let QuoteAsset = String(item["base_currency"]).toLowerCase();
                if (symbolType === 'spot') {
                    Symbol = BaseAsset + '_' + QuoteAsset;
                }
                else {
                    Contract = 'swap';
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['instrument_name']),
                    Contract: Contract,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item["tick_size"]),
                    AmountSize: null,
                    PricePrecision: countDecimalPlaces(item['tick_size']),
                    AmountPrecision: null,
                    MinQty: convertToNumber(item['min_qty']),
                    MaxQty: convertToNumber(item['max_qty']),
                    MinNotional: convertToNumber(item['min_trade_amount']),
                    MaxNotional: convertToNumber(item['max_trade_amount']),
                    CtVal: convertToNumber(item['min_notional']),
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["result"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Last = convertToNumber(item["last_price"]);
                let price_change = convertToNumber(item["price_change_percent_24h"]);
                let Open = convertToNumber((Last - price_change).toFixed(countDecimalPlaces(Last)));
                let High = convertToNumber(item["highest_price_24h"]);
                let Low = convertToNumber(item["lowest_price_24h"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                let Symbol = String(item["trading_pairs"]).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['trading_pairs']),
                    High: High,
                    Low: Low,
                    Sell: convertToNumber(item["lowest_ask"]),
                    Buy: convertToNumber(item["highest_bid"]),
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["base_volume"]),
                    QuoteVolume: convertToNumber(item["quote_volume"]),
                    Time: null,
                    Info: item
                };
            }
        }

        parseTickersData2(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["result"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item["product_type"] !== 'perpetual') {
                    continue;
                }
                let BaseAsset = String(item["base_currency"]).toLowerCase();
                let QuoteAsset = String(item["target_currency"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['ticker_id']),
                    High: convertToNumber(item["high"]),
                    Low: convertToNumber(item["low"]),
                    Sell: convertToNumber(item["ask"]),
                    Buy: convertToNumber(item["bid"]),
                    Last: convertToNumber(item["last_price"]),
                    Open: null,
                    Volume: convertToNumber(item["base_volume"]),
                    QuoteVolume: convertToNumber(item["quote_volume"]),
                    Time: null,
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }

            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 500) {
                    limit = 500;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = 1;
                endBegin = begin + (limit - 1) * 60;
            }
            else if (interval === '15m') {
                _interval = 15;
                endBegin = begin + (limit - 1) * 900;
            }
            else {
                _interval = 'D';
                endBegin = begin + (limit - 1) * 86400;
            }
            let url = null;
            if (begin === null) {
                return
            }
            else {
                let date_now = Math.floor(Date.now() / 1000);
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?instrument_name=${alias}&resolution=${_interval}&start_timestamp=${begin}&end_timestamp=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['result'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['tick']) * 1000, convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['volume'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, 'spot', newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData(response, 'perpetual', newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData1(response, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData2(response, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 100, _symbol, alias, interval = '1d', begin = 1617206400000, limit = 500) {
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 100, _symbol, alias, interval = '1d', begin = 1622476800000, limit = 500) {
            while (true) {
                let klineArray = this.parseKlinesData(this.swap_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // Biconomy
    class Biconomy {
        constructor() {
            this.spot_markets_url = "https://www.biconomy.com/api/v1/exchangeInfo";
            this.spot_tickers_url = "https://www.biconomy.com/api/v1/tickers";
            this.spot_klines_url = "https://www.biconomy.com/api/v1/kline";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let PricePrecision = convertToNumber(item['quoteAssetPrecision']);
                let AmountPrecision = convertToNumber(item['baseAssetPrecision']);
                let BaseAsset = String(item["baseAsset"]).toLowerCase();
                let QuoteAsset = String(item["quoteAsset"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["ticker"];
            if (!Array.isArray(dataArray)) {
                return
            }
            let Time = convertToNumber(response["timestamp"]);
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Last = convertToNumber(item["last"]);
                let change = convertToNumber(item["change"]);
                let Open = convertToNumber((Last * (1 - change * 0.01)).toFixed(countDecimalPlaces(Last)));
                let High = convertToNumber(item["high"]);
                let Low = convertToNumber(item["low"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                let Symbol = String(item["symbol"]).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    High: High,
                    Low: Low,
                    Sell: convertToNumber(item["sell"]),
                    Buy: convertToNumber(item["buy"]),
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["vol"]),
                    QuoteVolume: null,
                    Time: Time,
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1000) {
                    limit = 1000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = '1min';
            }
            else if (interval === '15m') {
                _interval = '15min';
            }
            else {
                _interval = 'day';
            }

            let url = `${base_url}?symbol=${alias}&type=${_interval}&size=${limit}`;

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 100, _symbol, alias, interval = '1d', begin = null, limit = 1000) {
            let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }
    }

    // DigiFinex
    class DigiFinex {
        constructor() {
            this.spot_markets_url = "https://openapi.digifinex.com/v3/markets";
            this.swap_markets_url = "https://openapi.digifinex.com/swap/v2/public/instruments";
            this.spot_tickers_url = "https://openapi.digifinex.com/v3/ticker";
            this.swap_tickers_url = "https://openapi.digifinex.com/swap/v2/public/tickers";
            this.spot_klines_url = "https://openapi.digifinex.com/v3/kline";
            this.swap_klines_url = "https://openapi.digifinex.com/swap/v2/public/candles_history";
            this.funding_url = "https://openapi.digifinex.com/swap/v2/public/funding_rate_history";
        }

        parseMarketsData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let PricePrecision = convertToNumber(item['price_precision']);
                let AmountPrecision = convertToNumber(item['volume_precision']);
                let Symbol = String(item["market"]).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['market']),
                    Contract: null,
                    BaseAsset: Symbol.split('_')[0],
                    QuoteAsset: Symbol.split('_')[1],
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item['min_volume']),
                    MaxQty: null,
                    MinNotional: convertToNumber(item['min_amount']),
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseMarketsData2(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item["contract_type"] !== 'PERPETUAL') {
                    continue;
                }
                let BaseAsset = String(item["base_currency"]).toLowerCase();
                let QuoteAsset = String(item["quote_currency"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['instrument_id']),
                    Contract: 'swap',
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item['tick_size']),
                    AmountSize: null,
                    PricePrecision: convertToNumber(item['price_precision']),
                    AmountPrecision: null,
                    MinQty: convertToNumber(item['min_order_amount']),
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: convertToNumber(item['contract_value']),
                    CtValCcy: String(item['contract_value_currency']).toLowerCase(),
                    Info: item
                };
            }
        }

        parseTickersData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["ticker"];
            if (!Array.isArray(dataArray)) {
                return
            }
            let Time = response["date"];
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Symbol = String(item["symbol"]).replace(/-/g, '_').toLowerCase();
                let Last = convertToNumber(item["last"]);
                let change = convertToNumber(item["change"]);
                let Open = convertToNumber((Last * (1 - change * 0.01)).toFixed(countDecimalPlaces(Last)));
                let High = convertToNumber(item["high"]);
                let Low = convertToNumber(item["low"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    High: High,
                    Low: Low,
                    Sell: convertToNumber(item["sell"]),
                    Buy: convertToNumber(item["buy"]),
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["vol"]),
                    QuoteVolume: null,
                    Time: Time,
                    Info: item
                };
            }
        }

        parseTickersData2(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Symbol = String(item["instrument_id"]).replace(/-/g, '_').toLowerCase() + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['instrument_id']),
                    High: convertToNumber(item["high_24h"]),
                    Low: convertToNumber(item["low_24h"]),
                    Sell: convertToNumber(item["best_ask"]),
                    Buy: convertToNumber(item["best_bid"]),
                    Last: convertToNumber(item["last"]),
                    Open: convertToNumber(item["open_24h"]),
                    Volume: convertToNumber(item["volume_24h"]),
                    QuoteVolume: null,
                    Time: convertToNumber(item["timestamp"]),
                    Info: item
                };
            }
        }

        parseKlinesData1(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }

            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 500) {
                    limit = 500;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = 1;
            }
            else if (interval === '15m') {
                _interval = 15;
            }
            else {
                _interval = '1D';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&period=${_interval}`;
            }
            else {
                url = `${base_url}?symbol=${alias}&period=${_interval}&end_time=${begin}`;
            }
            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item[0]) * 1000, convertToNumber(item[5]), convertToNumber(item[3]),
                        convertToNumber(item[4]), convertToNumber(item[2]), convertToNumber(item[1])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesData2(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 100) {
                    limit = 100;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = "1m";
            }
            else if (interval === '15m') {
                _interval = "15m";
            }
            else {
                _interval = '1d';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?instrument_id=${alias}&granularity=${_interval}&limit=${limit}`;
            }
            else {
                url = `${base_url}?instrument_id=${alias}&granularity=${_interval}&limit=${limit}&start_timestamp=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let data = response['data'];
                if (Object.prototype.toString.call(data) !== '[object Object]') {
                    return 
                }
                let dataArray = data['candles'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[6])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesFundingData(base_url, _symbol, alias, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 100) {
                    limit = 100;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let url = null;
            let endBegin = null;
            if (begin === null) {
                url = `${base_url}?instrument_id=${alias}&limit=${limit}`;
            }
            else {
                url = `${base_url}?instrument_id=${alias}&limit=${limit}&start_timestamp=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let data = response['data'];
                if (Object.prototype.toString.call(data) !== '[object Object]') {
                    return
                }
                let dataArray = data['funding_rates'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['time']), convertToNumber(item['rate'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData1(response, newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData2(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData1(response, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData2(response, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 200, _symbol, alias, interval = '1d', begin = null, limit = 500) {
            let klineArray = this.parseKlinesData1(this.spot_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 200, _symbol, alias, interval = '1d', begin = 1585670400000, limit = 100) {
            while (true) {
                let klineArray = this.parseKlinesData2(this.swap_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(资金费率)
        fetchKlinesFunding(sleep = 200, _symbol, alias, begin = 1601510400000, limit = 100) {
            while (true) {
                let klineArray = this.parseKlinesFundingData(this.funding_url, _symbol, alias, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // WhiteBIT
    class WhiteBIT {
        constructor() {
            this.spot_markets_url = "https://whitebit.com/api/v4/public/markets";
            this.swap_markets_url = "https://whitebit.com/api/v4/public/markets";
            this.spot_tickers_url = "https://whitebit.com/api/v4/public/ticker";
            this.swap_tickers_url = "https://whitebit.com/api/v4/public/ticker";
            this.spot_klines_url = "https://whitebit.com/api/v1/public/kline";
            this.swap_klines_url = "https://whitebit.com/api/v1/public/kline";
        }

        parseMarketsData(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                if (item['type'].toLowerCase() !== symbolType) {
                    continue;
                }
                let Symbol = null;
                let Contract = null;
                let TickSize = null;
                let AmountSize = null;
                let PricePrecision = convertToNumber(item['moneyPrec']);
                if (PricePrecision < 0) {
                    TickSize = convertToNumber(Math.pow(10, Math.abs(PricePrecision)));
                }
                else {
                    TickSize = convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision));
                }
                let AmountPrecision = convertToNumber(item['stockPrec']);
                if (AmountPrecision < 0) {
                    AmountSize = convertToNumber(Math.pow(10, Math.abs(AmountPrecision)));
                }
                else {
                    AmountSize = convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision));
                }
                let BaseAsset = String(item["stock"]).toLowerCase();
                let QuoteAsset = String(item["money"]).toLowerCase();
                if (symbolType === 'spot') {
                    Symbol = BaseAsset + '_' + QuoteAsset;
                }
                else {
                    Contract = 'swap';
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['name']),
                    Contract: Contract,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: TickSize,
                    AmountSize: AmountSize,
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item['minAmount']),
                    MaxQty: convertToNumber(item['maxAmount']),
                    MinNotional: convertToNumber(item['minTotal']),
                    MaxNotional: convertToNumber(item['maxTotal']),
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, symbolObject, newDataObject) {
            if (response === null) {
                return
            }
            if (Object.prototype.toString.call(response) !== '[object Object]') {
                return
            }
            for (let _symbol in response) {
                if (!(_symbol in symbolObject)) {
                    continue;
                }
                let Symbol = symbolObject[_symbol];
                let item = response[_symbol];
                let Last = convertToNumber(item["last_price"]);
                let change = convertToNumber(item["change"]);
                let Open = convertToNumber((Last * (1 - change * 0.01)).toFixed(countDecimalPlaces(Last)));
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(_symbol),
                    High: null,
                    Low: null,
                    Sell: null,
                    Buy: null,
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["base_volume"]),
                    QuoteVolume: convertToNumber(item["quote_volume"]),
                    Time: null,
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }

            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1440) {
                    limit = 1440;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = '1m';
                endBegin = begin + (limit - 1) * 60;
            }
            else if (interval === '15m') {
                _interval = "15m";
                endBegin = begin + (limit - 1) * 900;
            }
            else {
                _interval = '1d';
                endBegin = begin + (limit - 1) * 86400;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?market=${alias}&interval=${_interval}&limit=${limit}`;
            }
            else {
                let date_now = Math.floor(Date.now() / 1000);
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?market=${alias}&interval=${_interval}&limit=${limit}&start=${begin}&end=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['result'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item[0]) * 1000, convertToNumber(item[1]), convertToNumber(item[3]),
                        convertToNumber(item[4]), convertToNumber(item[2]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, 'spot', newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData(response, 'futures', newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let symbolObject = {};
            let markets_response = jsonFetch(this.spot_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            if (!Array.isArray(markets_response)) {
                return newDataObject
            }
            for (let i = 0; i < markets_response.length; i++) {
                let item = markets_response[i];
                if (item['type'].toLowerCase() !== "spot") {
                    continue;
                }
                let name = String(item["name"]);
                let BaseAsset = String(item["stock"]).toLowerCase();
                let QuoteAsset = String(item["money"]).toLowerCase();
                symbolObject[name] = BaseAsset + '_' + QuoteAsset;
            }
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, symbolObject, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let symbolObject = {};
            let markets_response = jsonFetch(this.swap_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            if (!Array.isArray(markets_response)) {
                return newDataObject
            }
            for (let i = 0; i < markets_response.length; i++) {
                let item = markets_response[i];
                if (item['type'].toLowerCase() !== "futures") {
                    continue;
                }
                let name = String(item["name"]);
                let BaseAsset = String(item["stock"]).toLowerCase();
                let QuoteAsset = String(item["money"]).toLowerCase();
                symbolObject[name] = BaseAsset + '_' + QuoteAsset + '.swap';
            }
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData(response, symbolObject, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 50, _symbol, alias, interval = '1d', begin = 1567267200000, limit = 1440) {
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 50, _symbol, alias, interval = '1d', begin = 1654012800000, limit = 1440) {
            while (true) {
                let klineArray = this.parseKlinesData(this.swap_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // Hotcoin
    class Hotcoin {
        constructor() {
            this.spot_markets_url = "https://api.hotcoinfin.com/v1/common/symbols";
            this.swap_markets_url = "https://api-ct.hotcoin.fit/api/v1/perpetual/public";
            this.spot_tickers_url = "https://api.hotcoinfin.com/v1/market/ticker";
            this.swap_tickers_url = "https://api-ct.hotcoin.fit/api/v1/perpetual/public";
            this.spot_klines_url = "https://api.hotcoinfin.com/v1/ticker";
            this.swap_klines_url = "https://api-ct.hotcoin.fit/api/v1/perpetual/public";
        }

        parseMarketsData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let PricePrecision = convertToNumber(item['pricePrecision']);
                let AmountPrecision = convertToNumber(item['amountPrecision']);
                let BaseAsset = String(item["baseCurrency"]).toLowerCase();
                let QuoteAsset = String(item["quoteCurrency"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item['minOrderCount']),
                    MaxQty: convertToNumber(item['maxOrderCount']),
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseMarketsData2(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let code = String(item["code"]).toLowerCase();
                let QuoteAsset = String(item['quote']).toLowerCase();
                let BaseAsset = code.replace(QuoteAsset, '');
                let PricePrecision = convertToNumber(item['minQuoteDigit']);
                let AmountPrecision = convertToNumber(item['minTradeDigit']);
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['code']),
                    Contract: 'swap',
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: convertToNumber(item['unitAmount']),
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["ticker"];
            if (!Array.isArray(dataArray)) {
                return
            }
            let Time = response["timestamp"];
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Symbol = String(item["symbol"]).replace(/-/g, '_').toLowerCase();
                let Last = convertToNumber(item["last"]);
                let change = convertToNumber(item["change"]);
                let Open = convertToNumber((Last * (1 - change * 0.01)).toFixed(countDecimalPlaces(Last)));
                let High = convertToNumber(item["high"]);
                let Low = convertToNumber(item["low"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    High: High,
                    Low: Low,
                    Sell: convertToNumber(item["sell"]),
                    Buy: convertToNumber(item["buy"]),
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["vol"]),
                    QuoteVolume: null,
                    Time: Time,
                    Info: item
                };
            }
        }

        parseTickersData2(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Last = convertToNumber(item["price"]);
                let fluctuation = convertToNumber(item["fluctuation"]);
                let Open = convertToNumber((Last * (1 - fluctuation * 0.01)).toFixed(countDecimalPlaces(Last)));
                let High = convertToNumber(item["high"]);
                let Low = convertToNumber(item["low"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                let code = String(item["code"]).toLowerCase();
                let QuoteAsset = String(item['quote']).toLowerCase();
                let BaseAsset = code.replace(QuoteAsset, '');
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['code']),
                    High: High,
                    Low: Low,
                    Sell: null,
                    Buy: null,
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["amount24"]),
                    QuoteVolume: null,
                    Time: null,
                    Info: item
                };
            }
        }

        parseKlinesData1(base_url, _symbol, alias, interval, begin, limit) {
            let _interval = null;
            if (interval === '1m') {
                _interval = 60;
            }
            else if (interval === '15m') {
                _interval = 900;
            }
            else {
                _interval = 86400;
            }
            let url = `${base_url}?symbol=${alias}&step=${_interval}`;

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesData2(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1440) {
                    limit = 1440;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = "1min";
                endBegin = begin + (limit - 1) * 60000;
            }
            else if (interval === '15m') {
                _interval = "15min";
                endBegin = begin + (limit - 1) * 900000;
            }
            else {
                _interval = 'day';
                endBegin = begin + (limit - 1) * 86400000;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}/${alias}/candles?kline=${_interval}&size=${limit}&klineType=1`;
            }
            else {
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}/${alias}/candles?kline=${_interval}&size=${limit}&klineType=1&since=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[3]), convertToNumber(item[2]),
                        convertToNumber(item[1]), convertToNumber(item[4]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData1(response, newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData2(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData1(response, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData2(response, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 50, _symbol, alias, interval = '1d', begin = null, limit = null) {
            let klineArray = this.parseKlinesData1(this.spot_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 50, _symbol, alias, interval = '1d', begin = null, limit = 1440) {
            let klineArray = this.parseKlinesData2(this.swap_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }
    }

    // Bitvavo
    class Bitvavo {
        constructor() {
            this.assets_url = "https://api.bitvavo.com/v2/assets";
            this.spot_markets_url = "https://api.bitvavo.com/v2/markets";
            this.spot_tickers_url = "https://api.bitvavo.com/v2/ticker/24h";
            this.spot_klines_url = "https://api.bitvavo.com/v2";
        }

        parseMarketsData(response, assetsObject, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                if (item['status' !== 'trading']) {
                    continue;
                }
                let BaseAsset = item["base"];
                if (!(BaseAsset in assetsObject)) {
                    continue;
                }
                let QuoteAsset = item["quote"];
                let PricePrecision = convertToNumber(item['pricePrecision']);
                let AmountPrecision = convertToNumber(assetsObject[BaseAsset]);
                let Symbol = String(BaseAsset).toLowerCase() + '_' + String(QuoteAsset).toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['market']),
                    Contract: null,
                    BaseAsset: String(BaseAsset).toLowerCase(),
                    QuoteAsset: String(QuoteAsset).toLowerCase(),
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item['minOrderInBaseAsset']),
                    MaxQty: convertToNumber(item['maxOrderInBaseAsset']),
                    MinNotional: convertToNumber(item['minOrderInQuoteAsset']),
                    MaxNotional: convertToNumber(item['maxOrderInQuoteAsset']),
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let Symbol = String(item["market"]).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['market']),
                    High: convertToNumber(item["high"]),
                    Low: convertToNumber(item["low"]),
                    Sell: convertToNumber(item["ask"]),
                    Buy: convertToNumber(item["bid"]),
                    Last: convertToNumber(item["last"]),
                    Open: convertToNumber(item["open"]),
                    Volume: convertToNumber(item["volume"]),
                    QuoteVolume: convertToNumber(item["volumeQuote"]),
                    Time: convertToNumber(item["timestamp"]),
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1440) {
                    limit = 1440;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = '1m';
                endBegin = begin + (limit - 1) * 60000;
            }
            else if (interval === '15m') {
                _interval = "15m";
                endBegin = begin + (limit - 1) * 900000;
            }
            else {
                _interval = '1d';
                endBegin = begin + (limit - 1) * 86400000;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}/${alias}/candles?interval=${_interval}&limit=${limit}`;
            }
            else {
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}/${alias}/candles?interval=${_interval}&limit=${limit}&start=${begin}&end=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                response.reverse();
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let assets_response = jsonFetch(this.assets_url);
            if (assets_response === null) {
                return newDataObject
            }
            if (!Array.isArray(assets_response)) {
                return newDataObject
            }
            let assetsObject = {}
            for (let i = 0; i < assets_response.length; i++) {
                let item = assets_response[i];
                assetsObject[item["symbol"]] = item["decimals"];
            }
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, assetsObject, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 80, _symbol, alias, interval = '1d', begin = 1551369600000, limit = 1440) {
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // CITEX
    class CITEX {
        constructor() {
            this.spot_markets_url = "https://openapi.citex.io/spot/symbol/list";
            this.swap_markets_url = "https://openapi.citex.io/future/symbol/list";
            this.spot_tickers_url = "https://www.citex.io/prod-api/market/tiker/list?businessType=spot";
            this.swap_tickers_url = "https://www.citex.io/prod-api/market/tiker/list?businessType=cfd";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let PricePrecision = convertToNumber(item['baseCoinScale']);
                let AmountPrecision = convertToNumber(item['coinScale']);
                let BaseAsset = String(item["coinSymbol"]).toLowerCase();
                let QuoteAsset = String(item["baseSymbol"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item['minVolume']),
                    MaxQty: convertToNumber(item['maxVolume']),
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["ticker"];
            if (!Array.isArray(dataArray)) {
                return
            }
            let Time = response["date"];
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Symbol = String(item["symbol"]).replace(/-/g, '_').toLowerCase();
                let Last = convertToNumber(item["last"]);
                let change = convertToNumber(item["change"]);
                let Open = convertToNumber((Last * (1 - change)).toFixed(countDecimalPlaces(Last)));
                let High = convertToNumber(item["high"]);
                let Low = convertToNumber(item["low"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    High: High,
                    Low: Low,
                    Sell: convertToNumber(item["sell"]),
                    Buy: convertToNumber(item["buy"]),
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["vol"]),
                    QuoteVolume: null,
                    Time: Time,
                    Info: item
                };
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let ts = new Date().getTime();
            let apiKey = "93a69018-25da-4a3c-a925-6d2d0bf46b49"
            let apiSecret = "5f6e54d2-78e1-4cae-bb92-18870c63c50d"

            // 签名过程
            let pattern = `ts=${ts}, apiKey=${apiKey}, apiSecret=${apiSecret}`;
            let data = `${pattern}`.replace(/\{(\d+)\}/g, (_, index) => {
                switch (parseInt(index)) {
                    case 0: return ts;
                    case 1: return apiKey;
                    case 2: return apiSecret;
                    default: return '';
                }
            });

            let options = {
                method: "GET",
                body: "a=10&b=20&c=30",
                charset: "UTF-8",
                cookie: null,
                debug: false,
                headers: { 'ts': ts, 'apiKey': apiKey, 'sign': MD5(data) },
            }
            let response = jsonFetch(this.spot_markets_url, options);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }
    }

    // Bitrue
    class Bitrue {
        constructor() {
            this.spot_markets_url = "https://www.bitrue.com/api/v1/exchangeInfo";
            this.swap_markets_urls = [
                "https://fapi.bitrue.com/fapi/v1/contracts",
                "https://fapi.bitrue.com/dapi/v1/contracts"
            ];
            this.spot_tickers_url = "https://www.bitrue.com/api/v1/ticker/24hr";
            this.swap_tickers_urls = [
                "https://fapi.bitrue.com/fapi/v1/ticker?contractName=",
                "https://fapi.bitrue.com/dapi/v1/ticker?contractName="
            ];
            this.spot_klines_url = "https://www.bitrue.com/api/v1/market/kline";
            this.u_swap_klines_url = "https://fapi.bitrue.com/fapi/v1/klines";
            this.b_swap_klines_url = "https://fapi.bitrue.com/dapi/v1/klines";
        }

        parseMarketsData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["symbols"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item['status' !== 'TRADING']) {
                    continue;
                }
                let BaseAsset = String(item["baseAsset"]).toLowerCase();
                let QuoteAsset = String(item["quoteAsset"]).toLowerCase();
                let TickSize = null;
                let AmountSize = null;
                let PricePrecision = null;
                let AmountPrecision = null;
                let MinQty = null;
                let MaxQty = null;
                let MinNotional = null;
                let MaxNotional = null;
                let CtVal = null;
                let filters = item['filters'];
                for (let j = 0; j < filters.length; j++) {
                    let temp_item = filters[j];
                    let filter_type = temp_item['filterType'];
                    if (filter_type == "PRICE_FILTER") {
                        TickSize = convertToNumber(temp_item['tickSize']);
                        PricePrecision = countDecimalPlaces(temp_item['tickSize']);
                    }
                    else if (filter_type == "LOT_SIZE") {
                        AmountSize = convertToNumber(temp_item['stepSize']);
                        AmountPrecision = countDecimalPlaces(temp_item['stepSize']);
                        MinQty = convertToNumber(temp_item['minQty']);
                        MaxQty = convertToNumber(temp_item['maxQty']);
                        MinNotional = convertToNumber(temp_item['minVal']);
                        MaxNotional = null;
                    }
                }
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: TickSize,
                    AmountSize: AmountSize,
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: MinQty,
                    MaxQty: MaxQty,
                    MinNotional: MinNotional,
                    MaxNotional: MaxNotional,
                    CtVal: CtVal,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseMarketsData2(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                if (item['type'] !== 'E') {
                    continue;
                }
                let _symbol = String(item['symbol']).toLowerCase();
                let BaseAsset = _symbol.split('-')[1];
                let QuoteAsset = _symbol.split('-')[2];
                let PricePrecision = convertToNumber(item['pricePrecision']);
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: 'swap',
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: null,
                    PricePrecision: PricePrecision,
                    AmountPrecision: null,
                    MinQty: null,
                    MaxQty: convertToNumber(item['maxValidOrder']),
                    MinNotional: convertToNumber(item['minOrderMoney']),
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData1(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let Symbol = String(item["symbol"]).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    High: convertToNumber(item["highPrice"]),
                    Low: convertToNumber(item["lowPrice"]),
                    Sell: convertToNumber(item["askPrice"]),
                    Buy: convertToNumber(item["bidPrice"]),
                    Last: convertToNumber(item["lastPrice"]),
                    Open: convertToNumber(item["openPrice"]),
                    Volume: convertToNumber(item["volume"]),
                    QuoteVolume: convertToNumber(item["quoteVolume"]),
                    Time: null,
                    Info: item
                };
            }
        }

        parseTickersData2(response, _symbol, newDataObject) {
            if (response === null) {
                return
            }
            if (Object.prototype.toString.call(response) !== '[object Object]') {
                return
            }
            try {
                let Last = convertToNumber(response["last"]);
                let rose = convertToNumber(response["rose"]);
                let Open = convertToNumber((Last * (1 - rose)).toFixed(countDecimalPlaces(Last)));
                let High = convertToNumber(response["high"]);
                let Low = convertToNumber(response["low"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                let symbol_list = _symbol.toLowerCase().split('-');
                let Symbol = symbol_list[1] + '_' + symbol_list[2] + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: _symbol,
                    High: High,
                    Low: Low,
                    Sell: null,
                    Buy: null,
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(response["vol"]),
                    QuoteVolume: null,
                    Time: convertToNumber(response["time"]),
                    Info: response
                };
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name}  Method: parseTickersData2  Symbol: ${_symbol}`, String(error));
            }
        }

        parseKlinesData1(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1440) {
                    limit = 1440;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = '1m';
                endBegin = begin + (limit - 1) * 60000;
            }
            else if (interval === '15m') {
                _interval = "15m";
                endBegin = begin + (limit - 1) * 900000;
            }
            else {
                _interval = '1D';
                endBegin = begin + (limit - 1) * 86400000;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&scale=${_interval}&limit=${limit}`;
            }
            else {
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?symbol=${alias}&scale=${_interval}&limit=${limit}&fromIdx=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['i']) * 1000, convertToNumber(item['o']), convertToNumber(item['h']),
                        convertToNumber(item['l']), convertToNumber(item['c']), convertToNumber(item['v'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesData2(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 300) {
                    limit = 300;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = '1min';
            }
            else if (interval === '15m') {
                _interval = "15min";
            }
            else {
                _interval = '1day';
            }

            let url = `${base_url}?contractName=${alias}&interval=${_interval}&limit=${limit}`;

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                response.reverse();
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(item['idx']), convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['vol'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData1(response, newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            this.swap_markets_urls.map(url => {
                let response = jsonFetch(url);
                this.parseMarketsData2(response, newDataObject);
            });
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData1(response, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            this.swap_markets_urls.map(url => {
                let markets_response = jsonFetch(url);
                for (let i = 0; i < markets_response.length; i++) {
                    let item = markets_response[i];
                    if (item['type'] !== 'E') {
                        continue;
                    }
                    let _symbol = item['symbol'];
                    let tempUrl = null;
                    if (url.includes('dapi')) {
                        tempUrl = this.swap_tickers_urls[1] + _symbol;

                    } else {
                        tempUrl = this.swap_tickers_urls[0] + _symbol;
                    }
                    let response = jsonFetch(tempUrl);
                    this.parseTickersData2(response, _symbol, newDataObject)
                    Sleep(100);
                }
            });
            return newDataObject

        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 100, _symbol, alias, interval = '1d', begin = 1519833600000, limit = 1440) {
            while (true) {
                let klineArray = this.parseKlinesData1(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 100, _symbol, alias, interval = '1d', begin = null, limit = 300) {
            let swap_klines_url = null;
            if (alias.split('-')[2] === 'USD') {
                swap_klines_url = this.b_swap_klines_url;
            }
            else {
                swap_klines_url = this.u_swap_klines_url;
            }
            let klineArray = this.parseKlinesData2(swap_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }
    }

    // Coincheck
    class Coincheck {
        constructor() {
            this.spot_markets_url = "https://coincheck.com/api/ticker/all";
            this.spot_tickers_url = "https://coincheck.com/api/ticker/all";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let Symbol = String(item["pair"]).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['pair']),
                    Contract: null,
                    BaseAsset: Symbol.split('_')[0],
                    QuoteAsset: Symbol.split('_')[1],
                    TickSize: null,
                    AmountSize: null,
                    PricePrecision: null,
                    AmountPrecision: null,
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let Symbol = String(item["pair"]).replace(/-/g, '_').toLowerCase();
                let Last = convertToNumber(item["last"]);
                let change = convertToNumber(item["price_change_percent_24h"]);
                let Open = convertToNumber((Last * (1 - change)).toFixed(countDecimalPlaces(Last)));
                let High = convertToNumber(item["high"]);
                let Low = convertToNumber(item["low"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['pair']),
                    High: High,
                    Low: Low,
                    Sell: convertToNumber(item["ask"]),
                    Buy: convertToNumber(item["bid"]),
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["volume"]),
                    QuoteVolume: convertToNumber(item["quote_volume"]),
                    Time: convertToNumber(item["timestamp"]),
                    Info: item
                };
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }
    }

    // CoinTr
    class CoinTr {
        constructor() {
            this.spot_markets_url = "https://api.cointr.pro/v1/spot/public/instruments";
            this.swap_markets_url = "https://api.cointr.pro/v1/futures/public/instruments";
            this.spot_tickers_url = "https://api.cointr.pro/v1/spot/market/tickers";
            this.swap_tickers_url = "https://api.cointr.pro/v1/futures/market/tickers";
            this.spot_klines_url = "https://api.cointr.pro/v1/spot/market/candlesticks";
            this.swap_klines_url = "https://api.cointr.pro/v1/futures/market/candlesticks";
        }

        parseMarketsData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let MinQty = null;
                let BaseAsset = String(item["baseCcy"]).toLowerCase();
                let QuoteAsset = String(item["quoteCcy"]).toLowerCase();
                let PricePrecision = convertToNumber(item['pxPrecision']);
                let AmountPrecision = convertToNumber(item['amtPrecision']);
                let minMktBuySz = convertToNumber(item['minMktBuySz']);
                let minMktSellSz = convertToNumber(item['minMktSellSz']);
                if (minMktBuySz < minMktSellSz) {
                    MinQty = minMktBuySz;
                }
                else {
                    MinQty = minMktSellSz;
                }
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['instId']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: MinQty,
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseMarketsData2(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = String(item["baseCcy"]).toLowerCase();
                let QuoteAsset = String(item["quoteCcy"]).toLowerCase();
                let PricePrecision = convertToNumber(item['pxPrecision']);
                let steps = convertToNumber(item['steps'].split(',')[0])
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['instId']),
                    Contract: 'swap',
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: steps,
                    PricePrecision: PricePrecision,
                    AmountPrecision: countDecimalPlaces(steps),
                    MinQty: convertToNumber(item['minSz']),
                    MaxQty: convertToNumber(item['maxSz']),
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: convertToNumber(item['ctVal']),
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Symbol = null;
                if (symbolType === 'spot') {
                    Symbol = String(item["instId"]).replace(/-/g, '_').toLowerCase();
                }
                else {
                    Symbol = String(item["instId"]).replace(/-/g, '_').toLowerCase() + '.swap';
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['instId']),
                    High: convertToNumber(item["high24h"]),
                    Low: convertToNumber(item["low24h"]),
                    Sell: convertToNumber(item["askPx"]),
                    Buy: convertToNumber(item["bidPx"]),
                    Last: convertToNumber(item["lastPx"]),
                    Open: convertToNumber(item["open24h"]),
                    Volume: convertToNumber(item["vol24h"]),
                    QuoteVolume: convertToNumber(item["volCcy24h"]),
                    Time: convertToNumber(item["uTime"]),
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }

            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 2000) {
                    limit = 2000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = '1m';
                endBegin = begin + (limit - 1) * 60;
            }
            else if (interval === '15m') {
                _interval = '15m';
                endBegin = begin + (limit - 1) * 900;
            }
            else {
                _interval = '1D';
                endBegin = begin + (limit - 1) * 86400;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?instId=${alias}&bar=${_interval}&limit=${limit}`;
            }
            else {
                let date_now = Math.floor(Date.now() / 1000);
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?instId=${alias}&bar=${_interval}&limit=${limit}&endTs=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item[0]) * 1000, convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData1(response, newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData2(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, 'spot', newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData(response, 'swap', newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 100, _symbol, alias, interval = '1d', begin = null, limit = 2000) {
            let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 100, _symbol, alias, interval = '1d', begin = null, limit = 2000) {
            let klineArray = this.parseKlinesData(this.swap_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }
    }

    // LATOKEN
    class LATOKEN {
        constructor() {
            this.currency_url = "https://api.latoken.com/v2/currency";
            this.spot_markets_url = "https://api.latoken.com/v2/pair";
            this.spot_tickers_url = "https://api.latoken.com/v2/ticker";
        }

        parseMarketsData(response, symbolId, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let PricePrecision = convertToNumber(item['priceDecimals']);
                let AmountPrecision = convertToNumber(item['quantityDecimals']);
                if (PricePrecision < 0) {
                    PricePrecision = 0;
                }
                if (AmountPrecision < 0) {
                    AmountPrecision = 0;
                }
                let BaseAsset = symbolId[item["baseCurrency"]];
                let QuoteAsset = symbolId[item["quoteCurrency"]];
                let Symbol = String(BaseAsset).toLowerCase() + '_' + String(QuoteAsset).toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(BaseAsset) + String(QuoteAsset),
                    Contract: null,
                    BaseAsset: String(BaseAsset).toLowerCase(),
                    QuoteAsset: String(QuoteAsset).toLowerCase(),
                    TickSize: convertToNumber(item['priceTick']),
                    AmountSize: convertToNumber(item['quantityTick']),
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item['minOrderQuantity']),
                    MaxQty: null,
                    MinNotional: convertToNumber(item['minOrderCostUsd']),
                    MaxNotional: convertToNumber(item['maxOrderCostUsd']),
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let Symbol = String(item["symbol"]).replace('/', '_').toLowerCase();
                let Last = convertToNumber(item["lastPrice"]);
                let change = convertToNumber(item["change24h"]);
                let Open = convertToNumber((Last * (1 - change * 0.01)).toFixed(countDecimalPlaces(Last)));
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    High: null,
                    Low: null,
                    Sell: convertToNumber(item["bestAsk"]),
                    Buy: convertToNumber(item["bestBid"]),
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["amount24h"]),
                    QuoteVolume: convertToNumber(item["volume24h"]),
                    Time: convertToNumber(item["updateTimestamp"]),
                    Info: item
                };
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let currency_response = jsonFetch(this.currency_url);
            if (currency_response === null) {
                return newDataObject
            }
            if (!Array.isArray(currency_response)) {
                return newDataObject
            }
            let symbolId = {};
            for (let i = 0; i < currency_response.length; i++) {
                let item = currency_response[i];
                symbolId[item["id"]] = item["tag"];
            }
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, symbolId, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }
    }

    // FameEx
    class FameEx {
        constructor() {
            this.spot_markets_url = "https://api.fameex.com/v2/public/summary";
            this.swap_markets_url = "https://api.fameex.com/swap-api/v1/symbols";
            this.spot_tickers_url = "https://api.fameex.com/api/v2/ticker/24hr";
            this.swap_tickers_url = "https://api.fameex.com/swap-api/v2/tickers";
            this.spot_klines_url = "https://api.fameex.com/v1/market/history/kline";
            this.swap_klines_url = "https://api.fameex.com/swap-api/v2/tickers";
        }

        parseMarketsData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = String(item['base_currency']).toLowerCase();
                let QuoteAsset = String(item['quote_currency']).toLowerCase();
                let PricePrecision = convertToNumber(item['quotePrecision']);
                let AmountPrecision = convertToNumber(item['basePrecision']);
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['trading_pairs']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item['permitAmount']),
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseMarketsData2(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = String(item['base']).toLowerCase();
                let QuoteAsset = String(item['quote']).toLowerCase();
                let PricePrecision = convertToNumber(item['quotePrecision']);
                let AmountPrecision = convertToNumber(item['basePrecision']);
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: BaseAsset + QuoteAsset,
                    Contract: 'swap',
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item['permitAmount']),
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData1(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let Last = convertToNumber(item["last_price"]);
                let change = convertToNumber(item["price_change_percent_24h"]);
                let Open = convertToNumber((Last * (1 - change * 0.01)).toFixed(countDecimalPlaces(Last)));
                let High = convertToNumber(item["highest_price_24h"]);
                let Low = convertToNumber(item["lowest_price_24h"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                let Symbol = String(item["trading_pairs"]).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['trading_pairs']),
                    High: High,
                    Low: Low,
                    Sell: convertToNumber(item["lowest_ask"]),
                    Buy: convertToNumber(item["highest_bid"]),
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["base_volume"]),
                    QuoteVolume: convertToNumber(item["quote_volume"]),
                    Time: null,
                    Info: item
                };
            }
        }

        parseTickersData2(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let base_currency = String(item["base_currency"]).toLowerCase();
                let quote_currency = String(item["quote_currency"]).toLowerCase();
                let Symbol = base_currency + '_' + quote_currency + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['ticker_id']),
                    High: convertToNumber(item["high"]),
                    Low: convertToNumber(item["low"]),
                    Sell: convertToNumber(item["ask"]),
                    Buy: convertToNumber(item["bid"]),
                    Last: convertToNumber(item["last_price"]),
                    Open: null,
                    Volume: convertToNumber(item["base_volume"]),
                    QuoteVolume: convertToNumber(item["quote_volume"]),
                    Time: null,
                    Info: item
                };
            }
        }

        parseKlinesData1(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }

            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 2000) {
                    limit = 2000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = 1;
                endBegin = begin + (limit - 1) * 60;
            }
            else if (interval === '15m') {
                _interval = 15;
                endBegin = begin + (limit - 1) * 900;
            }
            else {
                _interval = '1D';
                endBegin = begin + (limit - 1) * 86400;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&period=${_interval}`;
            }
            else {
                let date_now = Math.floor(Date.now() / 1000);
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?symbol=${alias}&period=${_interval}&startTime=${begin}&endTime=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['time']) * 1000, convertToNumber(item['open']), convertToNumber(item['hight']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['amount'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesData2(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }

            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 2000) {
                    limit = 2000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = 1;
                endBegin = begin + (limit - 1) * 60;
            }
            else if (interval === '15m') {
                _interval = 15;
                endBegin = begin + (limit - 1) * 900;
            }
            else {
                _interval = '1D';
                endBegin = begin + (limit - 1) * 86400;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?contractCode=${alias}&period=${_interval}`;
            }
            else {
                let date_now = Math.floor(Date.now() / 1000);
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?contractCode=${alias}&period=${_interval}&startTime=${begin}&endTime=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['time']) * 1000, convertToNumber(item['open']), convertToNumber(item['hight']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['amount'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData1(response, newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData2(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData1(response, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData2(response, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 100, _symbol, alias, interval = '1d', begin = null, limit = 2000) {
            while (true) {
                let klineArray = this.parseKlinesData1(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 100, _symbol, alias, interval = '1d', begin = null, limit = 2000) {
            while (true) {
                let klineArray = this.parseKlinesData2(this.swap_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // Phemex
    class Phemex {
        constructor() {
            this.spot_markets_url = "https://api.phemex.com/public/products";
            this.swap_markets_url = "https://api.phemex.com/public/products";
            this.spot_tickers_url = "https://api.phemex.com/v1/md/spot/ticker/24hr/all";
            this.swap_tickers_url = "https://api.phemex.com/md/v1/ticker/24hr/all";
            this.swap_klines_url = "https://api.phemex.com/exchange/public/md/v2/kline";
        }

        parseMarketsData1(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"]["products"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item["type"].toLowerCase() !== symbolType) {
                    continue;
                }
                let BaseAsset = String(item['baseCurrency'].toLowerCase());
                let QuoteAsset = String(item['quoteCurrency'].toLowerCase());
                let AmountSize = convertToNumber(item['baseTickSize'].split(' ')[0]);
                let PricePrecision = convertToNumber(item['pricePrecision']);
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: AmountSize,
                    PricePrecision: PricePrecision,
                    AmountPrecision: countDecimalPlaces(AmountSize),
                    MinQty: null,
                    MaxQty: convertToNumber(item['maxBaseOrderSize'].split(' ')[0]),
                    MinNotional: convertToNumber(item['minOrderValue'].split(' ')[0]),
                    MaxNotional: convertToNumber(item['maxOrderValue'].split(' ')[0]),
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseMarketsData2(response, symbolType, dataList, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"][dataList];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item["type"].toLowerCase() !== symbolType) {
                    continue;
                }
                let Amount = null;
                if (dataList === "products") {
                    Amount = 'lotSize';
                }
                else {
                    Amount = 'qtyPrecision';
                }
                let _symbol = String(item["symbol"]).toLowerCase();
                let QuoteAsset = item['quoteCurrency'].toLowerCase();
                let BaseAsset = _symbol.replace(QuoteAsset, '');
                let AmountPrecision = convertToNumber(item[Amount]);
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: 'swap',
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item['tickSize']),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: convertToNumber(item['pricePrecision']),
                    AmountPrecision: AmountPrecision,
                    MinQty: null,
                    MaxQty: convertToNumber(item['maxOrderQty']),
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, scaleDict, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["result"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let _symbol = String(item["symbol"]);
                let High = convertToNumber(item["highEp"]);
                let Low = convertToNumber(item["lowEp"]);
                let Sell = convertToNumber(item["askEp"]);
                let Buy = convertToNumber(item["bidEp"]);
                let Last = convertToNumber(item["lastEp"]);
                let Open = convertToNumber(item["openEp"]);
                let Volume = convertToNumber(item["volumeEv"]);
                let QuoteVolume = convertToNumber(item["turnoverEv"]);
                let Time = convertToNumber(String(item["timestamp"]).slice(0, 13));
                if (!scaleDict.hasOwnProperty(_symbol)) {
                    continue;
                }
                let priceScale = scaleDict[_symbol]["priceScale"];
                let baseTickSizeEv = scaleDict[_symbol]["baseTickSizeEv"];
                let PricePrecision = scaleDict[_symbol]["pricePrecision"];
                let price_scale = convertToNumber(Math.pow(0.1, priceScale).toFixed(priceScale));
                let Symbol = _symbol.replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: _symbol,
                    High: convertToNumber(High * price_scale).toFixed(pricePrecision),
                    Low: convertToNumber(Low * price_scale).toFixed(pricePrecision),
                    Sell: convertToNumber(Sell * price_scale).toFixed(pricePrecision),
                    Buy: convertToNumber(Buy * price_scale).toFixed(pricePrecision),
                    Last: convertToNumber(Last * price_scale).toFixed(pricePrecision),
                    Open: convertToNumber(Open * price_scale).toFixed(pricePrecision),
                    Volume: convertToNumber(Volume / (baseTickSizeEv * 10)),
                    QuoteVolume: convertToNumber(QuoteVolume / (baseTickSizeEv * 10)),
                    Time: Time,
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }

            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1000) {
                    limit = 1000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = 60;
                endBegin = begin + (limit - 1) * 60;
            }
            else if (interval === '15m') {
                _interval = 900;
                endBegin = begin + (limit - 1) * 900;
            }
            else {
                _interval = 86400;
                endBegin = begin + (limit - 1) * 86400;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&resolution=${_interval}&limit=${limit}`;
            }
            else {
                let date_now = Math.floor(Date.now() / 1000);
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?symbol=${alias}&resolution=${_interval}&limit=${limit}&from=${begin}&to=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let data = response['data'];
                if (data === null) {
                    return
                }
                let rowsArray = data['rows'];
                if (!Array.isArray(rowsArray)) {
                    return klineArray
                }
                rowsArray.reverse();
                for (let i = 0; i < rowsArray.length; i++) {
                    let item = rowsArray[i];
                    klineArray.push([_symbol, convertToNumber(item[0]) * 1000, convertToNumber(item[3]), convertToNumber(item[4]),
                        convertToNumber(item[5]), convertToNumber(item[6]), convertToNumber(item[7])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData1(response, 'spot', newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData2(response, "perpetual", "products", newDataObject);
            this.parseMarketsData2(response, "perpetualv2", "perpProductsV2", newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let markets_response = jsonFetch(this.spot_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            let scaleDict = {};
            let dataArray = markets_response["data"]["products"];
            if (!Array.isArray(dataArray)) {
                return newDataObject
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item["type"].toLowerCase() !== 'spot') {
                    continue;
                }
                scaleDict[item['symbol'].toLowerCase()] = {
                    priceScale: convertToNumber(item["priceScale"]),
                    baseTickSizeEv: convertToNumber(item["baseTickSizeEv"]),
                    pricePrecision: convertToNumber(item['pricePrecision'])
                };
            }
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, scaleDict, newDataObject);
            return newDataObject
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 50, _symbol, alias, interval = '1d', begin = 1633017600000, limit = 1440) {
            if (alias.slice(-3) != 'USD') {
                return
            }
            while (true) {
                let klineArray = this.parseKlinesData(this.swap_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // Pionex
    class Pionex {
        constructor() {
            this.spot_markets_url = "https://api.pionex.com/api/v1/common/symbols?type=SPOT";
            this.swap_markets_url = "https://api.pionex.com/api/v1/common/symbols?type=PERP";
            this.spot_tickers_url = "https://api.pionex.com/api/v1/market/tickers?type=SPOT";
            this.swap_tickers_url = "https://api.pionex.com/api/v1/market/tickers?type=PERP";
            this.spot_klines_url = "https://api.pionex.com/api/v1/market/klines";
            this.swap_klines_url = "https://api.pionex.com/api/v1/market/klines";
        }

        parseMarketsData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"]["symbols"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item["type"].toLowerCase() !== 'spot') {
                    continue;
                }
                let PricePrecision = convertToNumber(item['quotePrecision']);
                let AmountPrecision = convertToNumber(item['basePrecision']);
                let BaseAsset = String(item["baseCurrency"]).toLowerCase();
                let QuoteAsset = String(item["quoteCurrency"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item['minTradeSize']),
                    MaxQty: convertToNumber(item['maxTradeSize']),
                    MinNotional: convertToNumber(item['minAmount']),
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseMarketsData2(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"]["symbols"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item["type"].toLowerCase() !== 'perp') {
                    continue;
                }
                let minSizeLimit = convertToNumber(item['minSizeLimit']);
                let maxSizeLimit = convertToNumber(item['maxSizeLimit']);
                let minSizeMarket = convertToNumber(item['minSizeMarket']);
                let maxSizeMarket = convertToNumber(item['maxSizeMarket']);
                let MinQty = null;
                let MaxQty = null;
                if (minSizeLimit < minSizeMarket) {
                    MinQty = minSizeLimit;
                }
                else {
                    MinQty = minSizeMarket;

                }
                if (maxSizeLimit > maxSizeMarket) {
                    MaxQty = maxSizeLimit;
                }
                else {
                    MaxQty = maxSizeMarket;
                }
                let BaseAsset = String(item["baseCurrency"]).toLowerCase();
                let QuoteAsset = String(item["quoteCurrency"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: 'swap',
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item['quoteStep']),
                    AmountSize: convertToNumber(item['baseStep']),
                    PricePrecision: convertToNumber(item['quotePrecision']),
                    AmountPrecision: convertToNumber(item['basePrecision']),
                    MinQty: MinQty,
                    MaxQty: MaxQty,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"]["tickers"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let symbol_list = String(item["symbol"]).toLowerCase().split('_');
                let Symbol = null;
                if (symbolType === 'spot') {
                    Symbol = symbol_list[0] + '_' + symbol_list[1];
                }
                else {
                    Symbol = symbol_list[0] + '_' + symbol_list[1] + '.swap';
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    High: convertToNumber(item["high"]),
                    Low: convertToNumber(item["low"]),
                    Sell: null,
                    Buy: null,
                    Last: convertToNumber(item["close"]),
                    Open: convertToNumber(item["open"]),
                    Volume: convertToNumber(item["volume"]),
                    QuoteVolume: convertToNumber(item["amount"]),
                    Time: convertToNumber(item["time"]),
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 500) {
                    limit = 500;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = '1M';
                endBegin = begin + (limit - 1) * 60000;
            }
            else if (interval === '15m') {
                _interval = '15M';
                endBegin = begin + (limit - 1) * 900000;
            }
            else {
                _interval = '1D';
                endBegin = begin + (limit - 1) * 86400000;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&interval=${_interval}&limit=${limit}`;
            }
            else {
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?symbol=${alias}&interval=${_interval}&limit=${limit}&endTime=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let data = response['data'];
                if (data === null) {
                    return
                }
                let dataArray = data['klines'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                dataArray.reverse();
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['time']), convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['volume'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData1(response, newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData2(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, 'spot', newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData(response, 'swap', newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 100, _symbol, alias, interval = '1d', begin = 1506787200000, limit = 500) {
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 100, _symbol, alias, interval = '1d', begin = 1685548800000, limit = 500) {
            while (true) {
                let klineArray = this.parseKlinesData(this.swap_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // CPatex
    class Cpatex {
        constructor() {
            this.spot_markets_url = "https://api.c-patex.com/api/v1/public/markets";
            this.spot_tickers_url = "https://api.c-patex.com/api/v1/public/tickers";
            this.spot_klines_url = "https://api.c-patex.com/api/v1/public/kline";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["result"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let PricePrecision = convertToNumber(item['moneyPrec']);
                let AmountPrecision = convertToNumber(item['stockPrec']);
                let BaseAsset = String(item["stock"]).toLowerCase();
                let QuoteAsset = String(item["money"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['name']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item['minAmount']),
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataObject = response["result"];
            if (Object.prototype.toString.call(dataObject) !== '[object Object]') {
                return
            }
            for (let _symbol in dataObject) {
                let item = dataObject[_symbol];
                let Symbol = String(_symbol).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(_symbol),
                    High: convertToNumber(item["ticker"]["high"]),
                    Low: convertToNumber(item["ticker"]["low"]),
                    Sell: convertToNumber(item["ticker"]["ask"]),
                    Buy: convertToNumber(item["ticker"]["bid"]),
                    Last: convertToNumber(item["ticker"]["last"]),
                    Open: convertToNumber(item["ticker"]["open"]),
                    Volume: convertToNumber(item["ticker"]["vol"]),
                    QuoteVolume: convertToNumber(item["ticker"]["deal"]),
                    Time: convertToNumber(item["at"]),
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }

            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1500) {
                    limit = 1500;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = 60;
                endBegin = begin + (limit - 1) * 60;
            }
            else if (interval === '15m') {
                _interval = 900;
                endBegin = begin + (limit - 1) * 900;
            }
            else {
                _interval = 86400;
                endBegin = begin + (limit - 1) * 86400;
            }
            let url = null;
            if (begin === null) {
                return
            }
            else {
                let date_now = Math.floor(Date.now() / 1000);
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?market=${alias}&interval=${_interval}&start=${begin}&end=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let result = response['result'];
                if (Object.prototype.toString.call(result) !== '[object Object]') {
                    return
                }
                let dataArray = result['kline'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['time']) * 1000, convertToNumber(item['open']), convertToNumber(item['highest']),
                        convertToNumber(item['lowest']), convertToNumber(item['close']), convertToNumber(item['volume'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 100, _symbol, alias, interval = '1d', begin = 1625068800000, limit = 1500) {
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // Coinone
    class Coinone {
        constructor() {
            this.spot_markets_url = "https://api.coinone.co.kr/public/v2/markets/KRW";
            this.spot_tickers_url = "https://api.coinone.co.kr/public/v2/ticker_new/KRW";
            this.spot_klines_url = "https://api.coinone.co.kr/public/v2/chart/KRW";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["markets"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = String(item["target_currency"]).toLowerCase();
                let QuoteAsset = String(item["quote_currency"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item["target_currency"]) + '-' + String(item["quote_currency"]),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item['price_unit']),
                    AmountSize: convertToNumber(item['qty_unit']),
                    PricePrecision: countDecimalPlaces(item['price_unit']),
                    AmountPrecision: countDecimalPlaces(item['qty_unit']),
                    MinQty: convertToNumber(item['min_qty']),
                    MaxQty: convertToNumber(item['max_qty']),
                    MinNotional: convertToNumber(item['min_order_amount']),
                    MaxNotional: convertToNumber(item['max_order_amount']),
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["tickers"];
            if (!Array.isArray(dataArray)) {
                return
            }
            let Time = response["server_time"];
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = String(item["target_currency"]).toLowerCase();
                let QuoteAsset = String(item["quote_currency"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item["target_currency"]) + '-' + String(item["quote_currency"]),
                    High: convertToNumber(item["high"]),
                    Low: convertToNumber(item["low"]),
                    Sell: convertToNumber(item["best_asks"][0]["price"]),
                    Buy: convertToNumber(item["best_bids"][0]["price"]),
                    Last: convertToNumber(item["last"]),
                    Open: convertToNumber(item["first"]),
                    Volume: convertToNumber(item["target_volume"]),
                    QuoteVolume: convertToNumber(item["quote_volume"]),
                    Time: Time,
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 500) {
                    limit = 500;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = "1m";
            }
            else if (interval === '15m') {
                _interval = "15m";
            }
            else {
                _interval = "1d";
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}/${alias.split('-')[0]}?interval=${_interval}&size=${limit}`;
            }
            else {
                url = `${base_url}/${alias.split('-')[0]}?interval=${_interval}&size=${limit}&timestamp=${begin}`;
            }
            
            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['chart'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                dataArray.reverse();
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['timestamp']), convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['target_volume'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 50, _symbol, alias, interval = '1d', begin = null, limit = 500) {
            let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }
    }

    // Coinstore
    class Coinstore {
        constructor() {
            this.spot_markets_url = "https://api.coinstore.com/api/v2/public/config/spot/symbols";
            this.swap_markets_url = "https://futures.coinstore.com/api/configs/public";
            this.spot_tickers_url = "https://api.coinstore.com/api/v1/market/tickers";
            this.swap_tickers_url = "https://futures.coinstore.com/api/v1/futureQuot/querySnapshot?contractId=";
            this.spot_klines_url = "https://api.coinstore.com/api/v1/market/kline";
            this.swap_klines_url = "https://futures.coinstore.com/api/v1/futureQuot/queryCandlestick";
            this.symbolObject = {};
        }

        parseMarketsData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = String(item["tradeCurrencyCode"]).toLowerCase();
                let QuoteAsset = String(item["quoteCurrencyCode"]).toLowerCase();
                let PricePrecision = convertToNumber(item['tickSz']);
                let AmountPrecision = convertToNumber(item['lotSz']);
                let minSizeLimit = convertToNumber(item['minLmtSz']);
                let minSizeMarket = convertToNumber(item['minMktSz']);
                let MinQty = null;
                if (minSizeLimit < minSizeMarket) {
                    MinQty = minSizeLimit;
                }
                else {
                    MinQty = minSizeMarket;

                }
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbolCode']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: MinQty,
                    MaxQty: null,
                    MinNotional: convertToNumber(item['minMktVa']),
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseMarketsData2(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"]["contracts"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = String(item["baseAsset"]).toLowerCase();
                let QuoteAsset = String(item["quoteAsset"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['name']),
                    Contract: 'swap',
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item['tickSize']),
                    AmountSize: convertToNumber(item['contractSize']),
                    PricePrecision: countDecimalPlaces(item['tickSize']),
                    AmountPrecision: countDecimalPlaces(item['contractSize']),
                    MinQty: convertToNumber(item['minOrderSize']),
                    MaxQty: convertToNumber(item['maxOrderSize']),
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Symbol = String(item["symbol"]).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    High: convertToNumber(item["high"]),
                    Low: convertToNumber(item["low"]),
                    Sell: convertToNumber(item["ask"]),
                    Buy: convertToNumber(item["bid"]),
                    Last: convertToNumber(item["close"]),
                    Open: convertToNumber(item["open"]),
                    Volume: convertToNumber(item["volume"]),
                    QuoteVolume: convertToNumber(item["amount"]),
                    Time: null,
                    Info: item
                };
            }
        }

        parseTickersData2(response, _symbol, newDataObject) {
            if (response === null) {
                return
            }
            if (Object.prototype.toString.call(response) !== '[object Object]') {
                return
            }
            try {
                let item = response["result"];
                let Last = convertToNumber(item["lp"]);
                let change = convertToNumber(item["pcr"]);
                let Open = convertToNumber((Last * (1 - change)).toFixed(countDecimalPlaces(Last)));
                let High = convertToNumber(item["ph"]);
                let Low = convertToNumber(item["pl"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                let Symbol = String(_symbol).replace(/-/g, '_').toLowerCase() + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(_symbol),
                    High: High,
                    Low: Low,
                    Sell: convertToNumber(item["asks"][0][0]),
                    Buy: convertToNumber(item["bids"][0][0]),
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["tv"]),
                    QuoteVolume: convertToNumber(item["tt"]),
                    Time: null,
                    Info: item
                };
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name}  Method: parseTickersData2  Symbol: ${_symbol}`, String(error));
            }
        }

        parseKlinesData1(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 2000) {
                    limit = 2000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = "1min";
            }
            else if (interval === '15m') {
                _interval = "15min";
            }
            else {
                _interval = "1day";
            }

            let url = `${base_url}/${alias}?period=${_interval}&size=${limit}`;

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let data = response['data'];
                if (Object.prototype.toString.call(data) !== '[object Object]') {
                    return
                }
                let dataArray = data['item'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['startTime']) * 1000, convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['volume'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesData2(base_url, _symbol, alias, symbolArray, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1440) {
                    limit = 1440;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = 60000;
            }
            else if (interval === '15m') {
                _interval = 900000;
            }
            else {
                _interval = 86400000;
            }

            let url = `${base_url}?contractId=${symbolArray[alias]}&range=${_interval}&limit=${limit}`;

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let data = response['data'];
                if (Object.prototype.toString.call(data) !== '[object Object]') {
                    return
                }
                let dataArray = data['lines'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 1; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let options = {
                method: "POST",
                body: JSON.stringify({}),
                charset: "UTF-8",
                cookie: null,
                debug: false,
                headers: null,
            }
            let response = jsonFetch(this.spot_markets_url, options);
            this.parseMarketsData1(response, newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData2(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData1(response, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let markets_response = jsonFetch(this.swap_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            let dataArray = markets_response["data"]["contracts"];
            if (!Array.isArray(dataArray)) {
                return newDataObject
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let response = jsonFetch(this.swap_tickers_url + item["contractId"]);
                this.parseTickersData2(response, item["name"], newDataObject);
                Sleep(500);
            }
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 50, _symbol, alias, interval = '1d', begin = null, limit = 2000) {
            let klineArray = this.parseKlinesData1(this.spot_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 50, _symbol, alias, interval = '1d', begin = null, limit = 1440) {
            if (Object.keys(this.symbolObject).length === 0) {
                let markets_response = jsonFetch(this.swap_markets_url);
                if (markets_response === null) {
                    return
                }
                let dataArray = markets_response["data"]["contracts"];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    let _symbol = String(item["name"]);
                    let contractId = item["contractId"];
                    this.symbolObject[_symbol] = contractId;
                }
            }
            let klineArray = this.parseKlinesData2(this.swap_klines_url, _symbol, alias, this.symbolObject, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }
    }

    // BigONE
    class BigONE {
        constructor() {
            this.spot_markets_url = "https://big.one/api/v3/asset_pairs";
            this.swap_markets_url = "https://big.one/api/contract/v2/symbols";
            this.spot_tickers_url = "https://big.one/api/v3/asset_pairs/tickers";
            this.swap_tickers_url = "https://big.one/api/contract/v2/instruments";
            this.spot_klines_url = "https://big.one/api/v3/asset_pairs";
        }

        parseMarketsData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let PricePrecision = convertToNumber(item['quote_scale']);
                let AmountPrecision = convertToNumber(item['base_scale']);
                let BaseAsset = String(item["base_asset"]["symbol"]).toLowerCase();
                let QuoteAsset = String(item["quote_asset"]["symbol"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['name']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: convertToNumber(item['min_quote_value']),
                    MaxNotional: convertToNumber(item['max_quote_value']),
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseMarketsData2(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let PricePrecision = convertToNumber(item['pricePrecision']);
                let AmountPrecision = convertToNumber(item['valuePrecision']);
                let BaseAsset = String(item["baseCurrency"]).toLowerCase();
                let QuoteAsset = String(item["quoteCurrency"]).toLowerCase();
                let CtVal = null;
                let CtValCcy = null;
                if (QuoteAsset === 'usd') {
                    CtVal = 1;
                    CtValCcy = QuoteAsset;
                }
                else if (QuoteAsset === 'usdt') {
                    CtVal = convertToNumber(item['multiplier']);
                    CtValCcy = BaseAsset;
                }
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: 'swap',
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item['priceStep']),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: convertToNumber(item['initialMargin']),
                    MaxNotional: null,
                    CtVal: CtVal,
                    CtValCcy: CtValCcy,
                    Info: item
                };
            }
        }

        parseTickersData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Sell = null;
                let Buy = null;
                let ask = item["ask"];
                if (ask !== null && ask !== undefined) {
                    Sell = convertToNumber(ask["price"]);
                }
                let bid = item["bid"];
                if (bid !== null && bid !== undefined) {
                    Buy = convertToNumber(bid["price"]);
                }
                let Symbol = String(item["asset_pair_name"]).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['asset_pair_name']),
                    High: convertToNumber(item["high"]),
                    Low: convertToNumber(item["low"]),
                    Sell: Sell,
                    Buy: Buy,
                    Last: convertToNumber(item["close"]),
                    Open: convertToNumber(item["open"]),
                    Volume: convertToNumber(item["volume"]),
                    QuoteVolume: null,
                    Time: null,
                    Info: item
                };
            }
        }

        parseTickersData2(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let Last = convertToNumber(item["latestPrice"]);
                let change = convertToNumber(item["last24hPriceChange"]);
                let Open = convertToNumber((Last * (1 - change)).toFixed(countDecimalPlaces(Last)));
                let High = convertToNumber(item["last24hMaxPrice"]);
                let Low = convertToNumber(item["last24hMinPrice"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                let Symbol = String(item["symbol"]).replace(/-/g, '_').toLowerCase() + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    High: High,
                    Low: Low,
                    Sell: null,
                    Buy: null,
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["volume24h"]),
                    QuoteVolume: convertToNumber(item["turnover24h"]),
                    Time: null,
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 500) {
                    limit = 500;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = 'min1';
            }
            else if (interval === '15m') {
                _interval = 'min15';
            }
            else {
                _interval = 'day1';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}/${alias}/candles?period=${_interval}&limit=${limit}`;
            }
            else {
                if (interval === '1m') {
                    begin += 60000;
                }
                else if (interval === '15m') {
                    begin += 900000;
                }
                else {
                    begin += 86400000;
                }
                let beginDate = new Date(begin);
                url = `${base_url}/${alias}/candles?period=${_interval}&limit=${limit}&time=${beginDate.toISOString()}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                dataArray.reverse();
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    let time = new Date(item['time']);
                    klineArray.push([_symbol, time.getTime(), convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['volume'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData1(response, newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData2(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData1(response, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData2(response, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 20, _symbol, alias, interval = '1d', begin = null, limit = 500) {
            let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }
    }

    // Fastex
    class Fastex {
        constructor() {
            this.spot_markets_url = "https://exchange.fastex.com/api/v1/pair/list";
            this.spot_tickers_url = "https://exchange.fastex.com/api/v1/orderbook/ticker";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["response"]["entities"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Symbol = String(item["symbol"]).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: Symbol.split('_')[0],
                    QuoteAsset: Symbol.split('_')[1],
                    TickSize: convertToNumber(item['filters']['price']['step']),
                    AmountSize: convertToNumber(item['filters']['amount']['step']),
                    PricePrecision: countDecimalPlaces(item['filters']['price']['step']),
                    AmountPrecision: countDecimalPlaces(item['filters']['amount']['step']),
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["response"]["entities"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Sell = null;
                let Buy = null;
                let ask = item["ask"];
                if (ask !== null && ask !== undefined) {
                    Sell = convertToNumber(ask["price"]);
                }
                let bid = item["bid"];
                if (bid !== null && bid !== undefined) {
                    Buy = convertToNumber(bid["price"]);
                }
                let Symbol = String(item["symbol"]).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    High: null,
                    Low: null,
                    Sell: Sell,
                    Buy: Buy,
                    Last: null,
                    Open: null,
                    Volume: null,
                    QuoteVolume: null,
                    Time: null,
                    Info: item
                };
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }
    }

    // Azbit
    class Azbit {
        constructor() {
            this.spot_markets_url = "https://data.azbit.com/api/marketdata/coingecko/pairs";
            this.spot_tickers_url = "https://data.azbit.com/api/marketdata/coingecko/tickers";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let BaseAsset = String(item["base"]).toLowerCase();
                let QuoteAsset = String(item["target"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['ticker_id']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: null,
                    AmountSize: null,
                    PricePrecision: null,
                    AmountPrecision: null,
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let Symbol = String(item["ticker_id"]).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['ticker_id']),
                    High: convertToNumber(item["high"]),
                    Low: convertToNumber(item["low"]),
                    Sell: convertToNumber(item["ask"]),
                    Buy: convertToNumber(item["bid"]),
                    Last: convertToNumber(item["last_price"]),
                    Open: null,
                    Volume: convertToNumber(item["target_volume"]),
                    QuoteVolume: convertToNumber(item["base_volume"]),
                    Time: null,
                    Info: item
                };
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }
    }

    // BitMEX
    class BitMEX {
        constructor() {
            this.spot_markets_url = "https://www.bitmex.com/api/v1/instrument/active";
            this.swap_markets_url = "https://www.bitmex.com/api/v1/instrument/active";
            this.future_markets_url = "https://www.bitmex.com/api/v1/instrument/active";
            this.spot_tickers_url = "https://www.bitmex.com/api/v1/instrument/active";
            this.swap_tickers_url = "https://www.bitmex.com/api/v1/instrument/active";
            this.future_tickers_url = "https://www.bitmex.com/api/v1/instrument/active";
            this.spot_klines_url = "https://www.bitmex.com/api/v1/trade/bucketed";
            this.swap_klines_url = "https://www.bitmex.com/api/v1/trade/bucketed";
            this.future_klines_url = "https://www.bitmex.com/api/v1/trade/bucketed";
            this.index_url = "https://www.bitmex.com/api/v1/trade/bucketed";
            this.funding_url = "https://www.bitmex.com/api/v1/funding";
            this.symbolObject = {};
        }

        parseMarketsData(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                if (item["typ"] !== symbolType) {
                    continue;
                }
                if (item["state"] !== 'Open') {
                    continue;
                }
                let Symbol = null;
                let Contract = null;
                let CtVal = null;
                let CtValCcy = null;
                let BaseAsset = String(item["underlying"]).toLowerCase();
                let QuoteAsset = String(item["quoteCurrency"]).toLowerCase();
                if (symbolType === 'IFXXXP') {
                    Symbol = BaseAsset + '_' + QuoteAsset;
                }
                else if (symbolType === 'FFWCSX') {
                    Contract = 'swap';
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                    if (BaseAsset === 'xbt' && QuoteAsset === 'eth') {
                        CtVal = 0.01;
                        CtValCcy = QuoteAsset;
                    }
                    else if (BaseAsset === 'xbt' && QuoteAsset === 'eur') {
                        CtVal = 1;
                        CtValCcy = QuoteAsset;
                    }
                    else if (BaseAsset === 'xbt' && QuoteAsset === 'usd') {
                        CtVal = 1;
                        CtValCcy = QuoteAsset;
                    }
                    else if (BaseAsset !== 'xbt' && QuoteAsset === 'usd') {
                        CtVal = 1;
                        CtValCcy = QuoteAsset;
                    }
                    else if (QuoteAsset === 'usdt' || QuoteAsset === 'usdc') {
                        CtVal = convertToNumber(item["lotSize"]);
                        CtValCcy = BaseAsset;
                    }
                }
                else {
                    let _symbol = String(item['symbol']).toLowerCase();
                    Contract = _symbol.replace(BaseAsset, '').replace(QuoteAsset, '')
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                    if (BaseAsset === 'xbt' || QuoteAsset === 'eth') {
                        CtVal = 0.01;
                        CtValCcy = QuoteAsset;
                    }
                    else if (BaseAsset === 'xbt' && QuoteAsset === 'eur') {
                        CtVal = 1;
                        CtValCcy = QuoteAsset;
                    }
                    else if (BaseAsset === 'xbt' && QuoteAsset === 'usd') {
                        CtVal = 1;
                        CtValCcy = QuoteAsset;
                    }
                    else if (BaseAsset !== 'xbt' && QuoteAsset === 'usd') {
                        CtVal = 1;
                        CtValCcy = QuoteAsset;
                    }
                    else if (QuoteAsset === 'usdt' || QuoteAsset === 'usdc') {
                        CtVal = convertToNumber(item["lotSize"]);
                        CtValCcy = BaseAsset;
                    }
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: Contract,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item["tickSize"]),
                    AmountSize: null,
                    PricePrecision: countDecimalPlaces(item["tickSize"]),
                    AmountPrecision: null,
                    MinQty: convertToNumber(item["minOrderQty"]),
                    MaxQty: convertToNumber(item["maxOrderQty"]),
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: CtVal,
                    CtValCcy: CtValCcy,
                    Info: item
                };
            }
        }

        parseTickersData(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                if (item["typ"] !== symbolType) {
                    continue;
                }
                if (item["state"] !== 'Open') {
                    continue;
                }
                let Symbol = null;
                let Contract = null;
                let BaseAsset = String(item["underlying"]).toLowerCase();
                let QuoteAsset = String(item["quoteCurrency"]).toLowerCase();
                if (symbolType === 'IFXXXP') {
                    Symbol = BaseAsset + '_' + QuoteAsset;
                }
                else if (symbolType === 'FFWCSX') {
                    Contract = 'swap';
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                }
                else {
                    let _symbol = String(item['symbol']).toLowerCase();
                    Contract = _symbol.replace(BaseAsset, '').replace(QuoteAsset, '')
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                }
                let Last = convertToNumber(item["lastPrice"]);
                let change = convertToNumber(item["lastChangePcnt"]);
                let Open = convertToNumber((Last * (1 - change)).toFixed(countDecimalPlaces(Last)));
                let High = convertToNumber(item["highPrice"]);
                let Low = convertToNumber(item["lowPrice"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    High: High,
                    Low: Low,
                    Sell: convertToNumber(item["askPrice"]),
                    Buy: convertToNumber(item["bidPrice"]),
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["homeNotional24h"]),
                    QuoteVolume: convertToNumber(item["foreignNotional24h"]),
                    Time: convertToNumber(Date.parse(item["timestamp"])),
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 500) {
                    limit = 500;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = '1m';
            }
            else if (interval === '15m') {
                _interval = '5m';
            }
            else {
                _interval = '1d';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&binSize=${_interval}&count=${limit}&partial=true`;
            }
            else {
                let beginDate = new Date(begin);
                url = `${base_url}?symbol=${alias}&binSize=${_interval}&count=${limit}&partial=true&startTime=${beginDate.toISOString()}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    let time = new Date(item['timestamp']);
                    let timestamp = time.getTime();
                    klineArray.push([_symbol, timestamp, convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['homeNotional'])]);
                }
                if (interval === '15m') {
                    return createrKline(klineArray, interval)
                }
                else {
                    return klineArray
                }
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesIndexData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 500) {
                    limit = 500;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = '1m';
            }
            else if (interval === '15m') {
                _interval = '5m';
            }
            else {
                _interval = '1d';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${this.symbolObject[alias]}&binSize=${_interval}&count=${limit}&partial=true`;
            }
            else {
                let beginDate = new Date(begin);
                url = `${base_url}?symbol=${this.symbolObject[alias]}&binSize=${_interval}&count=${limit}&partial=true&startTime=${beginDate.toISOString()}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    let time = new Date(item['timestamp']);
                    let timestamp = time.getTime();
                    klineArray.push([_symbol, timestamp, convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['homeNotional'])]);
                }
                if (interval === '15m') {
                    return createrKline(klineArray, interval)
                }
                else {
                    return klineArray
                }
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesFundingData(base_url, _symbol, alias, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 500) {
                    limit = 500;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&count=${limit}&partial=true`;
            }
            else {
                let beginDate = new Date(begin);
                url = `${base_url}?symbol=${alias}&count=${limit}&partial=true&startTime=${beginDate.toISOString()}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    let time = new Date(item['timestamp']);
                    let timestamp = time.getTime();
                    klineArray.push([_symbol, timestamp, convertToNumber(item['fundingRate'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, "IFXXXP", newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData(response, "FFWCSX", newDataObject);
            return newDataObject
        }

        // Markets FUTURES(交割合约)
        getMarketsFuture() {
            let newDataObject = {};
            let response = jsonFetch(this.future_markets_url);
            this.parseMarketsData(response, "FFCCSX", newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, "IFXXXP", newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData(response, "FFWCSX", newDataObject);
            return newDataObject
        }

        // Tickers FUTURES(交割合约)
        getTickersFuture() {
            let newDataObject = {};
            let response = jsonFetch(this.future_tickers_url);
            this.parseTickersData(response, "FFCCSX", newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 2000, _symbol, alias, interval = '1d', begin = 1651334400000, limit = 1000) {
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 2000, _symbol, alias, interval = '1d', begin = 1533052800000, limit = 1000) {
            while (true) {
                let klineArray = this.parseKlinesData(this.swap_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(交割合约)
        fetchKlinesFuture(sleep = 2000, _symbol, alias, interval = '1d', begin = 1533052800000, limit = 1000) {
            while (true) {
                let klineArray = this.parseKlinesData(this.future_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(价格指数)
        fetchKlinesIndex(sleep = 2000, _symbol, alias, interval = '1d', begin = 1533052800000, limit = 1000) {
            if (Object.keys(this.symbolObject).length === 0) {
                let markets_response = jsonFetch(this.swap_markets_url);
                if (markets_response === null) {
                    return
                }
                if (!Array.isArray(markets_response)) {
                    return
                }
                for (let i = 0; i < markets_response.length; i++) {
                    let item = markets_response[i];
                    if (item["typ"] !== "FFWCSX") {
                        continue;
                    }
                    if (item["state"] !== 'Open') {
                        continue;
                    }
                    let _symbol = String(item['symbol']);
                    this.symbolObject[_symbol] = String(item["referenceSymbol"]);
                }
            }
            if (!(alias in this.symbolObject)) {
                return
            }
            while (true) {
                let klineArray = this.parseKlinesIndexData(this.index_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(资金费率)
        fetchKlinesFunding(sleep = 2000, _symbol, alias, begin = 1635696000000, limit = 500) {
            while (true) {
                let klineArray = this.parseKlinesFundingData(this.funding_url, _symbol, alias, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // DexTrade
    class DexTrade {
        constructor() {
            this.spot_markets_url = "https://api.dex-trade.com/v1/public/symbols";
            this.spot_tickers_url = "https://api.dex-trade.com/v1/public/tickers";
            this.spot_klines_url = "https://socket.dex-trade.com/graph/hist";
            this.symbolObject = {};
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let PricePrecision = convertToNumber(item['quote_decimal']);
                let AmountPrecision = convertToNumber(item['base_decimal']);
                let BaseAsset = String(item["base"]).toLowerCase();
                let QuoteAsset = String(item["quote"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['pair']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Symbol = String(item["pair"]).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['pair']),
                    High: convertToNumber(item["high"]),
                    Low: convertToNumber(item["low"]),
                    Sell: null,
                    Buy: null,
                    Last: convertToNumber(item["last"]),
                    Open: convertToNumber(item["open"]),
                    Volume: convertToNumber(item["volume_24H"]),
                    QuoteVolume: null,
                    Time: null,
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, symbolArray, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 30000) {
                    limit = 30000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = 1;
            }
            else if (interval === '15m') {
                _interval = 15;
            }
            else {
                _interval = 'D';
            }
            let url = `${base_url}?t=${alias}&r=${_interval}&limit=${limit}`;

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                response.reverse();
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(item['time']) * 1000, convertToNumber(item['open'] / symbolArray[alias][0]), convertToNumber(item['high'] / symbolArray[alias][0]),
                        convertToNumber(item['low'] / symbolArray[alias][0]), convertToNumber(item['close'] / symbolArray[alias][0]), convertToNumber(item['volume'] / symbolArray[alias][1])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 100, _symbol, alias, interval = '1d', begin = null, limit = 30000) {
            if (Object.keys(this.symbolObject).length === 0) {
                let markets_response = jsonFetch(this.spot_markets_url);
                if (markets_response === null) {
                    return
                }
                let dataArray = markets_response["data"];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    let _symbol = String(item["pair"]);
                    let rate_decimal = convertToNumber(item["rate_decimal"]);
                    let base_decimal = convertToNumber(item["base_decimal"]);
                    this.symbolObject[_symbol] = [convertToNumber(Math.pow(10, rate_decimal).toFixed(rate_decimal)), convertToNumber(Math.pow(10, base_decimal).toFixed(base_decimal))];
                }
            }
            let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, this.symbolObject, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }
    }

    // Bitso
    class Bitso {
        constructor() {
            this.spot_markets_url = "https://api.bitso.com/v3/available_books";
            this.spot_tickers_url = "https://sandbox.bitso.com/api/v3/ticker";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["payload"];
            if (dataArray === undefined) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Symbol = String(item["book"]).replace(/-/g, '_').toLowerCase();
                let BaseAsset = Symbol.split('_')[0];
                let QuoteAsset = Symbol.split('_')[1];
                let precision = {
                    'XRP': 0.000001,
                    'MXN': 0.01,
                    'TUSD': 0.01
                }
                let AmountSize = null;
                if (BaseAsset in precision) {
                    AmountSize = precision[BaseAsset];
                }
                else {
                    AmountSize = 0.00000001;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['book']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item["tick_size"]),
                    AmountSize: AmountSize,
                    PricePrecision: countDecimalPlaces(item["tick_size"]),
                    AmountPrecision: countDecimalPlaces(AmountSize),
                    MinQty: convertToNumber(item["minimum_amount"]),
                    MaxQty: convertToNumber(item["maximum_amount"]),
                    MinNotional: convertToNumber(item["minimum_value"]),
                    MaxNotional: convertToNumber(item["maximum_value"]),
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["payload"];
            if (dataArray === undefined) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Symbol = String(item["book"]).replace(/-/g, '_').toLowerCase();
                let Last = convertToNumber(item["last"]);
                let change = convertToNumber(item["change_24"]);
                let Open = convertToNumber((Last * (1 - change * 0.01)).toFixed(countDecimalPlaces(Last)));
                let High = convertToNumber(item["high"]);
                let Low = convertToNumber(item["low"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['book']),
                    High: High,
                    Low: Low,
                    Sell: convertToNumber(item["ask"]),
                    Buy: convertToNumber(item["bid"]),
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["volume"]),
                    QuoteVolume: null,
                    Time: convertToNumber(Date.parse(item["created_at"])),
                    Info: item
                };
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }
    }

    // Bitkub
    class Bitkub {
        constructor() {
            this.spot_markets_url = "https://api.bitkub.com/api/market/symbols";
            this.spot_tickers_url = "https://api.bitkub.com/api/market/ticker";
            this.spot_klines_url = "https://api.bitkub.com/tradingview/history";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["result"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let _symbol = String(item["symbol"]).replace(/-/g, '_').toLowerCase();
                let BaseAsset = _symbol.split('_')[1];
                let QuoteAsset = _symbol.split('_')[0];
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: null,
                    AmountSize: null,
                    PricePrecision: null,
                    AmountPrecision: null,
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            if (Object.prototype.toString.call(response) !== '[object Object]') {
                return
            }
            for (let _symbol in response) {
                let item = response[_symbol];
                let Last = convertToNumber(item["last"]);
                let change = convertToNumber(item["percentChange"]);
                let Open = convertToNumber((Last * (1 - change * 0.01)).toFixed(countDecimalPlaces(Last)));
                let High = convertToNumber(item["high24hr"]);
                let Low = convertToNumber(item["low24hr"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                let symbol_list = String(_symbol).replace(/-/g, '_').split('_');
                let BaseAsset = symbol_list[1];
                let QuoteAsset = symbol_list[0];
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(_symbol),
                    High: High,
                    Low: Low,
                    Sell: convertToNumber(item["lowestAsk"]),
                    Buy: convertToNumber(item["highestBid"]),
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["baseVolume"]),
                    QuoteVolume: convertToNumber(item["quoteVolume"]),
                    Time: null,
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }

            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 500) {
                    limit = 500;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = 1;
                endBegin = begin + limit * 60;
            }
            else if (interval === '15m') {
                _interval = 15;
                endBegin = begin + limit * 900;
            }
            else {
                _interval = '1D';
                endBegin = begin + limit * 86400;
            }
            let url = null;
            if (begin === null) {
                return;
            }
            else {
                let date_now = Math.floor(Date.now() / 1000);
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?symbol=${alias}&resolution=${_interval}&from=${begin}&to=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let timeArray = response['t'];
                let openArray = response['o'];
                let highArray = response['h'];
                let lowArray = response['l'];
                let closeArray = response['c'];
                let volumeArray = response['v'];
                if (!Array.isArray(timeArray)) {
                    return klineArray
                }
                for (let i = 0; i < timeArray.length; i++) {
                    klineArray.push([_symbol, convertToNumber(timeArray[i]) * 1000, convertToNumber(openArray[i]), convertToNumber(highArray[i]),
                        convertToNumber(lowArray[i]), convertToNumber(closeArray[i]), convertToNumber(volumeArray[i])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 50, _symbol, alias, interval = '1d', begin = 1525104000000, limit = 500) {
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // BtcTurkKripto
    class BtcTurkKripto {
        constructor() {
            this.spot_markets_url = "https://api.btcturk.com/api/v2/server/exchangeinfo";
            this.spot_tickers_url = "https://api.btcturk.com/api/v2/ticker";
            this.spot_klines_url = "https://graph-api.btcturk.com/v1/klines/history";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"]["symbols"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let TickSize = null;
                let MinQty = null;
                let MaxQty = null;
                let MinNotional = null;
                let PricePrecision = convertToNumber(item['denominatorScale']);
                let AmountPrecision = convertToNumber(item['numeratorScale']);
                let filters = item['filters'];
                for (let j = 0; j < filters.length; j++) {
                    let temp_item = filters[j];
                    let filter_type = temp_item['filterType'];
                    if (filter_type == "PRICE_FILTER") {
                        TickSize = convertToNumber(temp_item['tickSize']);
                        MinQty = convertToNumber(temp_item['minAmount']);
                        MaxQty = convertToNumber(temp_item['maxAmount']);
                        MinNotional = convertToNumber(temp_item['minExchangeValue']);
                    }
                }
                let BaseAsset = item["numerator"].toLowerCase();
                let QuoteAsset = item["denominator"].toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['name']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: TickSize,
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: MinQty,
                    MaxQty: MaxQty,
                    MinNotional: MinNotional,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = item["numeratorSymbol"].toLowerCase();
                let QuoteAsset = item["denominatorSymbol"].toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['pair']),
                    High: convertToNumber(item["high"]),
                    Low: convertToNumber(item["low"]),
                    Sell: convertToNumber(item["ask"]),
                    Buy: convertToNumber(item["bid"]),
                    Last: convertToNumber(item["last"]),
                    Open: convertToNumber(item["open"]),
                    Volume: convertToNumber(item["volume"]),
                    QuoteVolume: null,
                    Time: convertToNumber(item["timestamp"]),
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }

            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 500) {
                    limit = 500;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = 1;
                endBegin = begin + limit * 60;
            }
            else if (interval === '15m') {
                _interval = 15;
                endBegin = begin + limit * 900;
            }
            else {
                _interval = 1440;
                endBegin = begin + limit * 86400;
            }
            let url = null;
            if (begin === null) {
                return;
            }
            else {
                let date_now = Math.floor(Date.now() / 1000);
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?symbol=${alias}&resolution=${_interval}&from=${begin}&to=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let timeArray = response['t'];
                let openArray = response['o'];
                let highArray = response['h'];
                let lowArray = response['l'];
                let closeArray = response['c'];
                let volumeArray = response['v'];
                if (!Array.isArray(timeArray)) {
                    return klineArray
                }
                for (let i = 0; i < timeArray.length; i++) {
                    klineArray.push([_symbol, convertToNumber(timeArray[i]) * 1000, convertToNumber(openArray[i]), convertToNumber(highArray[i]),
                        convertToNumber(lowArray[i]), convertToNumber(closeArray[i]), convertToNumber(volumeArray[i])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 100, _symbol, alias, interval = '1d', begin = 1522512000000, limit = 500) {
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // HashKeyGlobal
    class HashKeyGlobal {
        constructor() {
            this.spot_markets_url = "https://api-glb.hashkey.com/api/v1/exchangeInfo";
            this.swap_markets_url = "https://api-glb.hashkey.com/api/v1/exchangeInfo";
            this.spot_tickers_url = "https://api-glb.hashkey.com/quote/v1/ticker/24hr";
            this.swap_tickers_url = "https://api-glb.hashkey.com/quote/v1/ticker/24hr";
            this.spot_klines_url = "https://api-glb.hashkey.com/quote/v1/klines";
            this.swap_klines_url = "https://api-glb.hashkey.com/quote/v1/klines";
        }

        parseMarketsData(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = null;
            if (symbolType === 'spot') {
                dataArray = response["symbols"];
            }
            else {
                dataArray = response["contracts"];
            }
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item["status"] !== 'TRADING') {
                    continue;
                }
                let Symbol = null;
                let Contract = null;
                let BaseAsset = null;
                let QuoteAsset = null
                let TickSize = null;
                let AmountSize = null;
                let PricePrecision = null;
                let AmountPrecision = null;
                let MinQty = null;
                let MaxQty = null;
                let MinNotional = null;
                let MaxNotional = null;
                let CtVal = null;
                let filters = item['filters'];
                for (let j = 0; j < filters.length; j++) {
                    let temp_item = filters[j];
                    let filter_type = temp_item['filterType'];
                    if (filter_type == "PRICE_FILTER") {
                        TickSize = convertToNumber(temp_item['tickSize']);
                        PricePrecision = countDecimalPlaces(temp_item['tickSize']);
                    }
                    else if (filter_type == "LOT_SIZE") {
                        AmountSize = convertToNumber(temp_item['stepSize']);
                        AmountPrecision = countDecimalPlaces(temp_item['stepSize']);
                        MinQty = convertToNumber(temp_item['minQty']);
                        MaxQty = convertToNumber(temp_item['maxQty']);
                    }
                    else if (filter_type == "TRADE_AMOUNT") {
                        MinNotional = convertToNumber(temp_item['minAmount']);
                        MaxNotional = convertToNumber(temp_item['maxAmount']);
                    }
                }
                if (symbolType === 'spot') {
                    BaseAsset = String(item["baseAsset"]).toLowerCase();
                    QuoteAsset = String(item["quoteAsset"]).toLowerCase();
                    Symbol = BaseAsset + '_' + QuoteAsset;
                }
                else {
                    BaseAsset = String(item["underlying"]).toLowerCase();
                    QuoteAsset = String(item["quoteAsset"]).toLowerCase();
                    Contract = 'swap';
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: Contract,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: TickSize,
                    AmountSize: AmountSize,
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: MinQty,
                    MaxQty: MaxQty,
                    MinNotional: MinNotional,
                    MaxNotional: MaxNotional,
                    CtVal: CtVal,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, _symbol, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                newDataObject[_symbol] = {
                    Symbol: _symbol,
                    Alias: String(item['s']),
                    High: convertToNumber(item["h"]),
                    Low: convertToNumber(item["l"]),
                    Sell: convertToNumber(item["a"]),
                    Buy: convertToNumber(item["b"]),
                    Last: convertToNumber(item["c"]),
                    Open: convertToNumber(item["o"]),
                    Volume: convertToNumber(item["v"]),
                    QuoteVolume: convertToNumber(item["qv"]),
                    Time: convertToNumber(item["t"]),
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1000) {
                    limit = 1000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = '1m';
                endBegin = begin + (limit - 1) * 60000;
            }
            else if (interval === '15m') {
                _interval = '15m';
                endBegin = begin + (limit - 1) * 900000;
            }
            else {
                _interval = '1d';
                endBegin = begin + (limit - 1) * 86400000;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&interval=${_interval}&limit=${limit}`;
            }
            else {
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?symbol=${alias}&interval=${_interval}&limit=${limit}&startTime=${begin}&endTime=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, 'spot', newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData(response, 'swap', newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let markets_response = jsonFetch(this.spot_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            let dataArray = markets_response["symbols"];
            if (!Array.isArray(dataArray)) {
                return newDataObject
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item["status"] !== 'TRADING') {
                    continue;
                }
                let BaseAsset = String(item["baseAsset"]).toLowerCase();
                let QuoteAsset = String(item["quoteAsset"]).toLowerCase();
                let _symbol = BaseAsset + '_' + QuoteAsset;
                let response = jsonFetch(this.spot_tickers_url + '?symbol=' + item["symbol"]);
                this.parseTickersData(response, _symbol, newDataObject);
                Sleep(500);
            }
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let markets_response = jsonFetch(this.swap_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            let dataArray = markets_response["contracts"];
            if (!Array.isArray(dataArray)) {
                return newDataObject
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item["status"] !== 'TRADING') {
                    continue;
                }
                let BaseAsset = String(item["underlying"]).toLowerCase();
                let QuoteAsset = String(item["quoteAsset"]).toLowerCase();
                let _symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                let response = jsonFetch(this.swap_tickers_url + '?symbol=' + item["symbol"]);
                this.parseTickersData(response, _symbol, newDataObject);
                Sleep(500);
            }
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 500, _symbol, alias, interval = '1d', begin = 1711900800000, limit = 1000) {
            if (alias.slice(-4) !== 'USDT') {
                return
            }
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 500, _symbol, alias, interval = '1d', begin = 1714492800000, limit = 1000) {
            while (true) {
                let klineArray = this.parseKlinesData(this.swap_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // HashKey
    class HashKey {
        constructor() {
            this.spot_markets_url = "https://api-pro.sim.hashkeydev.com/api/v1/exchangeInfo";
            this.spot_tickers_url = "https://api-pro.sim.hashkeydev.com/quote/v1/ticker/24hr";
            this.spot_klines_url = "https://api-pro.sim.hashkeydev.com/quote/v1/klines";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["symbols"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let status = item["status"];
                if (status !== 'TRADING') {
                    continue;
                }
                let TickSize = null;
                let AmountSize = null;
                let PricePrecision = null;
                let AmountPrecision = null;
                let MinQty = null;
                let MaxQty = null;
                let MinNotional = null;
                let MaxNotional = null;
                let CtVal = null;
                let filters = item['filters'];
                for (let j = 0; j < filters.length; j++) {
                    let temp_item = filters[j];
                    let filter_type = temp_item['filterType'];
                    if (filter_type == "PRICE_FILTER") {
                        TickSize = convertToNumber(temp_item['tickSize']);
                        PricePrecision = countDecimalPlaces(temp_item['tickSize']);
                    }
                    else if (filter_type == "LOT_SIZE") {
                        AmountSize = convertToNumber(temp_item['stepSize']);
                        AmountPrecision = countDecimalPlaces(temp_item['stepSize']);
                        MinQty = convertToNumber(temp_item['minQty']);
                        MaxQty = convertToNumber(temp_item['maxQty']);
                    }
                    else if (filter_type == "TRADE_AMOUNT") {
                        MinNotional = convertToNumber(temp_item['minAmount']);
                        MaxNotional = convertToNumber(temp_item['maxAmount']);
                    }
                }
                let BaseAsset = String(item["baseAsset"]).toLowerCase();
                let QuoteAsset = String(item["quoteAsset"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: TickSize,
                    AmountSize: AmountSize,
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: MinQty,
                    MaxQty: MaxQty,
                    MinNotional: MinNotional,
                    MaxNotional: MaxNotional,
                    CtVal: CtVal,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, _symbol, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                newDataObject[_symbol] = {
                    Symbol: _symbol,
                    Alias: String(item['s']),
                    High: convertToNumber(item["h"]),
                    Low: convertToNumber(item["l"]),
                    Sell: convertToNumber(item["a"]),
                    Buy: convertToNumber(item["b"]),
                    Last: convertToNumber(item["c"]),
                    Open: convertToNumber(item["o"]),
                    Volume: convertToNumber(item["v"]),
                    QuoteVolume: convertToNumber(item["qv"]),
                    Time: convertToNumber(item["t"]),
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1000) {
                    limit = 1000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = '1m';
                endBegin = begin + (limit - 1) * 60000;
            }
            else if (interval === '15m') {
                _interval = '15m';
                endBegin = begin + (limit - 1) * 900000;
            }
            else {
                _interval = '1d';
                endBegin = begin + (limit - 1) * 86400000;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&interval=${_interval}&limit=${limit}`;
            }
            else {
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?symbol=${alias}&interval=${_interval}&limit=${limit}&startTime=${begin}&endTime=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let markets_response = jsonFetch(this.spot_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            let dataArray = markets_response["symbols"];
            if (!Array.isArray(dataArray)) {
                return newDataObject
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item["status"] !== 'TRADING') {
                    continue;
                }
                let BaseAsset = String(item["baseAsset"]).toLowerCase();
                let QuoteAsset = String(item["quoteAsset"]).toLowerCase();
                let _symbol = BaseAsset + '_' + QuoteAsset;
                let response = jsonFetch(this.spot_tickers_url + '?symbol=' + item["symbol"]);
                this.parseTickersData(response, _symbol, newDataObject);
                Sleep(500);
            }
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 500, _symbol, alias, interval = '1d', begin = 1690819200000, limit = 1000) {
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // WOO
    class WOO {
        constructor() {
            this.spot_markets_url = "https://api.woo.org/v1/public/info";
            this.swap_markets_url = "https://api.woo.org/v1/public/info";
            this.swap_tickers_url = "https://api.woo.org/v1/public/futures";
            this.spot_klines_url = "https://api-pub.woo.org/v1/hist/kline";
            this.swap_klines_url = "https://api-pub.woo.org/v1/hist/kline";
            this.funding_url = "https://api-pub.woo.org/v1/public/funding_rate_history";
        }

        parseMarketsData(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["rows"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item["status"] !== 'TRADING') {
                    continue;
                }
                let symbol_list = String(item["symbol"]).toLowerCase().split('_');
                if (symbol_list[0] !== symbolType) {
                    continue;
                }
                let Symbol = null;
                let Contract = null;
                let BaseAsset = symbol_list[1];
                let QuoteAsset = symbol_list[2];
                let CtVal = null;
                let CtValCcy = null;
                if (symbolType === 'spot') {
                    Symbol = BaseAsset + '_' + QuoteAsset;
                }
                else {
                    Contract = 'swap';
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                    if (QuoteAsset === 'usd') {
                        CtVal = 1;
                        CtValCcy = QuoteAsset;
                    }
                    else if (QuoteAsset === 'usdt') {
                        CtVal = 1;
                        CtValCcy = BaseAsset;
                    }
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: Contract,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item['quote_tick']),
                    AmountSize: convertToNumber(item['base_tick']),
                    PricePrecision: countDecimalPlaces(item['quote_tick']),
                    AmountPrecision: countDecimalPlaces(item['base_tick']),
                    MinQty: convertToNumber(item['base_min']),
                    MaxQty: convertToNumber(item['base_max']),
                    MinNotional: convertToNumber(item['quote_min']),
                    MaxNotional: convertToNumber(item['quote_max']),
                    CtVal: CtVal,
                    CtValCcy: CtValCcy,
                    Info: item
                };
            }
        }

        parseTickersData(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["rows"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let symbol_list = String(item["symbol"]).toLowerCase().split('_');
                if (symbol_list[0] !== symbolType) {
                    continue;
                }
                let Symbol = null;
                let BaseAsset = symbol_list[1];
                let QuoteAsset = symbol_list[2];
                if (symbolType === 'spot') {
                    Symbol = BaseAsset + '_' + QuoteAsset;
                }
                else {
                    Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    High: convertToNumber(item["24h_high"]),
                    Low: convertToNumber(item["24h_low"]),
                    Sell: null,
                    Buy: null,
                    Last: convertToNumber(item["24h_close"]),
                    Open: convertToNumber(item["24h_open"]),
                    Volume: convertToNumber(item["24h_volume"]),
                    QuoteVolume: convertToNumber(item["24h_amount"]),
                    Time: convertToNumber(item["next_funding_time"]),
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            let _interval = null;
            if (interval === '1m') {
                _interval = '1m';
            }
            else if (interval === '15m') {
                _interval = '15m';
            }
            else {
                _interval = '1d';
            }
            let url = null;
            if (begin === null) {
                return
            }
            else {
                url = `${base_url}?symbol=${alias}&type=${_interval}&start_time=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataObject = response['data'];
                if (Object.prototype.toString.call(dataObject) !== '[object Object]') {
                    return
                }
                let rowsArray = dataObject['rows'];
                if (!Array.isArray(rowsArray)) {
                    return
                }
                for (let i = 0; i < rowsArray.length; i++) {
                    let item = rowsArray[i];
                    klineArray.push([_symbol, convertToNumber(item['start_timestamp']), convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['volume'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesFundingData(base_url, _symbol, alias, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 100) {
                    limit = 100;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let endBegin = null;
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&size=${limit}`;
            }
            else {
                endBegin = begin + (limit - 1) * 28800000;
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?symbol=${alias}&size=${limit}&start_t=${begin}&end_t=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['rows'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['funding_rate_timestamp']), convertToNumber(item['funding_rate'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, "spot", newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData(response, "perp", newDataObject)
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData(response, "perp", newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 1000, _symbol, alias, interval = '1d', begin = 1506787200000, limit = null) {
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 1000, _symbol, alias, interval = '1d', begin = 1646064000000, limit = null) {
            while (true) {
                let klineArray = this.parseKlinesData(this.swap_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(资金费率)
        fetchKlinesFunding(sleep = 100, _symbol, alias, begin = 1567267200000, limit = 100) {
            while (true) {
                let klineArray = this.parseKlinesFundingData(this.funding_url, _symbol, alias, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // Hibt
    class Hibt {
        constructor() {
            this.spot_markets_url = "https://api.hibt0.com/open-api/v1/common/symbols";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let PricePrecision = convertToNumber(item['priceScale']);
                let AmountPrecision = convertToNumber(item['coinScale']);
                let BaseAsset = String(item["coinSymbol"]).toLowerCase();
                let QuoteAsset = String(item["baseSymbol"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item['minVolume']),
                    MaxQty: convertToNumber(item['maxVolume']),
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }
    }

    // ZKE
    class ZKE {
        constructor() {
            this.spot_markets_url = "https://openapi.zke.com/sapi/v1/symbols";
            this.swap_markets_url = "https://futuresopenapi.zke.com/fapi/v1/contracts";
            this.spot_tickers_url = "https://openapi.zke.com/sapi/v1/ticker?symbol=";
            this.swap_tickers_url = "https://futuresopenapi.zke.com/fapi/v1/ticker?contractName=";
            this.spot_klines_url = "https://openapi.zke.com/sapi/v1/klines";
            this.swap_klines_url = "https://futuresopenapi.zke.com/fapi/v1/klines";
        }

        parseMarketsData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["symbols"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = item['baseAsset'].toLowerCase();
                let QuoteAsset = item['quoteAsset'].toLowerCase();
                let PricePrecision = convertToNumber(item['pricePrecision']);
                let AmountPrecision = convertToNumber(item['quantityPrecision']);
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseMarketsData2(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                if (item['type'] !== 'E') {
                    continue;
                }
                if (item['status'] !== 1) {
                    continue;
                }
                let symbol_list = String(item["symbol"]).toLowerCase().split("-");
                let BaseAsset = symbol_list[1];
                let QuoteAsset = symbol_list[2];
                let PricePrecision = convertToNumber(item['pricePrecision']);
                let maxMarketVolume = convertToNumber(item['maxMarketVolume']);
                let maxLimitVolume = convertToNumber(item['maxLimitVolume']);
                let MaxQty = null;
                if (maxMarketVolume > maxLimitVolume) {
                    MaxQty = maxMarketVolume;
                }
                else {
                    MaxQty = maxLimitVolume;
                }
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: 'swap',
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: convertToNumber(item['minOrderVolume']),
                    PricePrecision: PricePrecision,
                    AmountPrecision: countDecimalPlaces(item['minOrderVolume']),
                    MinQty: convertToNumber(item['minOrderVolume']),
                    MaxQty: MaxQty,
                    MinNotional: convertToNumber(item['minOrderMoney']),
                    MaxNotional: convertToNumber(item['maxMarketMoney']),
                    CtVal: convertToNumber(item['multiplier']),
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData1(response, _symbol, newDataObject) {
            if (response === null) {
                return
            }
            if (Object.prototype.toString.call(response) !== '[object Object]') {
                return
            }
            try {
                newDataObject[_symbol] = {
                    Symbol: _symbol,
                    Alias: String(response['symbol']),
                    High: convertToNumber(response["high"]),
                    Low: convertToNumber(response["low"]),
                    Sell: convertToNumber(response["sell"]),
                    Buy: convertToNumber(response["buy"]),
                    Last: convertToNumber(response["last"]),
                    Open: convertToNumber(response["open"]),
                    Volume: convertToNumber(response["vol"]),
                    QuoteVolume: null,
                    Time: convertToNumber(response["time"]),
                    Info: response
                };
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name}  Method: parseTickersData1  Symbol: ${_symbol}`, String(error));
            }
        }

        parseTickersData2(response, _symbol, newDataObject) {
            if (response === null) {
                return
            }
            if (Object.prototype.toString.call(response) !== '[object Object]') {
                return
            }
            try {
                let symbol_list = String(_symbol).toLowerCase().split("-");
                let BaseAsset = symbol_list[1];
                let QuoteAsset = symbol_list[2];
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                let Last = convertToNumber(response["last"]);
                let change = convertToNumber(response["rose"]);
                let Open = convertToNumber((Last * (1 - change)).toFixed(countDecimalPlaces(Last)));
                let High = convertToNumber(response["high"]);
                let Low = convertToNumber(response["low"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(_symbol),
                    High: High,
                    Low: Low,
                    Sell: convertToNumber(response["sell"]),
                    Buy: convertToNumber(response["buy"]),
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(response["vol"]),
                    QuoteVolume: null,
                    Time: convertToNumber(response["time"]),
                    Info: response
                };
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name}  Method: parseTickersData2  Symbol: ${_symbol}`, String(error));
            }
        }

        parseKlinesData1(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 300) {
                    limit = 300;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }

            let _interval = null;
            if (interval === '1m') {
                _interval = '1min';
            }
            else if (interval === '15m') {
                _interval = '15min';
            }
            else {
                _interval = '1day';
            }
            let url = `${base_url}?symbol=${alias}&interval=${_interval}&limit=${limit}`;
            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                response.reverse();
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(item['idx']), convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['vol'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesData2(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 300) {
                    limit = 300;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }

            let _interval = null;
            if (interval === '1m') {
                _interval = '1min';
            }
            else if (interval === '15m') {
                _interval = '15min';
            }
            else {
                _interval = '1day';
            }
            let url = `${base_url}?contractName=${alias}&interval=${_interval}&limit=${limit}`;
            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                response.reverse();
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(item['idx']), convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['vol'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData1(response, newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData2(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let markets_response = jsonFetch(this.spot_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            let dataArray = markets_response["symbols"];
            if (!Array.isArray(dataArray)) {
                return newDataObject
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = item['baseAsset'].toLowerCase();
                let QuoteAsset = item['quoteAsset'].toLowerCase();
                let _symbol = BaseAsset + '_' + QuoteAsset;
                let response = jsonFetch(this.spot_tickers_url + item["symbol"]);
                this.parseTickersData1(response, _symbol, newDataObject)
                Sleep(10);
            }
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let markets_response = jsonFetch(this.swap_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            if (!Array.isArray(markets_response)) {
                return newDataObject
            }
            for (let i = 0; i < markets_response.length; i++) {
                let item = markets_response[i];
                if (item['type'] !== 'E') {
                    continue;
                }
                if (item['status'] !== 1) {
                    continue;
                }
                let response = jsonFetch(this.swap_tickers_url + item["symbol"]);
                this.parseTickersData2(response, item["symbol"], newDataObject)
                Sleep(10);
            }
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 50, _symbol, alias, interval = '1d', begin = null, limit = 300) {
            let klineArray = this.parseKlinesData1(this.spot_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 50, _symbol, alias, interval = '1d', begin = null, limit = 300) {
            let klineArray = this.parseKlinesData2(this.swap_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }
    }

    // Zaif
    class Zaif {
        constructor() {
            this.spot_markets_url = "https://api.zaif.jp/api/1/currency_pairs/all";
            this.spot_tickers_url = "https://api.zaif.jp/api/1/ticker";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let Symbol = String(item["currency_pair"]).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['currency_pair']),
                    Contract: null,
                    BaseAsset: Symbol.split('_')[0],
                    QuoteAsset: Symbol.split('_')[1],
                    TickSize: convertToNumber(item['item_unit_step']),
                    AmountSize: convertToNumber(item['aux_unit_step']),
                    PricePrecision: countDecimalPlaces(item['item_unit_step']),
                    AmountPrecision: countDecimalPlaces(item['aux_unit_step']),
                    MinQty: convertToNumber(item['item_unit_min']),
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, _symbol, newDataObject) {
            if (response === null) {
                return
            }
            try {
                let Symbol = String(_symbol).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(_symbol),
                    High: convertToNumber(response["high"]),
                    Low: convertToNumber(response["low"]),
                    Sell: convertToNumber(response["ask"]),
                    Buy: convertToNumber(response["bid"]),
                    Last: convertToNumber(response["last"]),
                    Open: null,
                    Volume: convertToNumber(response["volume"]),
                    QuoteVolume: null,
                    Time: null,
                    Info: response
                };
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name}  Method: parseTickersData  Symbol: ${_symbol}`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let markets_response = jsonFetch(this.spot_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            if (!Array.isArray(markets_response)) {
                return newDataObject
            }
            for (let i = 0; i < markets_response.length; i++) {
                let item = markets_response[i];
                let response = jsonFetch(this.spot_tickers_url + "/" + item['currency_pair']);
                this.parseTickersData(response, item['currency_pair'], newDataObject);
                Sleep(100);
            }
            return newDataObject
        }
    }

    // Bitbank
    class Bitbank {
        constructor() {
            this.spot_markets_url = "https://api.bitbank.cc/spot/pairs";
            this.spot_tickers_url = "https://public.bitbank.cc/tickers";
            this.spot_klines_url = "https://public.bitbank.cc";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"]["pairs"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item["stop_order"] === true) {
                    continue;
                }
                let PricePrecision = convertToNumber(item['price_digits']);
                let AmountPrecision = convertToNumber(item['amount_digits']);
                let market_max_amount = convertToNumber(item['market_max_amount']);
                let limit_max_amount = convertToNumber(item['limit_max_amount']);
                let MaxQty = null;
                if (market_max_amount > limit_max_amount) {
                    MaxQty = market_max_amount;
                }
                else {
                    MaxQty = limit_max_amount;
                }
                let BaseAsset = String(item["base_asset"]).toLowerCase();
                let QuoteAsset = String(item["quote_asset"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['name']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item['unit_amount']),
                    MaxQty: MaxQty,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, symbolObject, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let _symbol = String(item["pair"]);
                if (!(_symbol in symbolObject)) {
                    continue;
                }
                let Symbol = symbolObject[_symbol];
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['pair']),
                    High: convertToNumber(item["high"]),
                    Low: convertToNumber(item["low"]),
                    Sell: convertToNumber(item["sell"]),
                    Buy: convertToNumber(item["buy"]),
                    Last: convertToNumber(item["last"]),
                    Open: convertToNumber(item["open"]),
                    Volume: convertToNumber(item["vol"]),
                    QuoteVolume: null,
                    Time: convertToNumber(item["timestamp"]),
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            let _interval = null;
            if (interval === '1m') {
                _interval = '1min';
            }
            else if (interval === '15m') {
                _interval = '15min';
            }
            else {
                _interval = '1day';
            }

            let urlArray = [];
            let url = null;
            if (begin === null) {
                return
            }
            else {
                let date_now = Date.now();
                let numberArray = [[0, 0], [86400000, 31536000000]];
                for (let i = 0; i < numberArray.length; i++) {
                    let dateTimeArray = numberArray[i];
                    let dateTime = null;
                    if (interval === '1m' || interval === '15m') {
                        begin += dateTimeArray[0];
                        if (begin > date_now) {
                            continue;
                        }
                        let date = new Date(begin);  // 创建 Date 对象
                        let year = date.getFullYear();  // 获取年
                        let month = String(date.getMonth() + 1).padStart(2, '0'); // 获取月
                        let day = String(date.getDate()).padStart(2, '0');  // 获取日
                        dateTime = `${year}${month}${day}`;
                    }
                    else {
                        begin += dateTimeArray[1];
                        if (begin > date_now) {
                            continue;
                        }
                        let date = new Date(begin);  // 创建 Date 对象
                        let year = date.getFullYear();  // 获取年
                        dateTime = `${year}`;
                    }
                    let url = `${base_url}/${alias}/candlestick/${_interval}/${dateTime}`;
                    urlArray.push(url)
                }
            }

            try {
                let klineArray = [];
                for (let i = 0; i < urlArray.length; i++) {
                    let url = urlArray[i];
                    let response = jsonFetch(url);
                    if (response === null) {
                        return
                    }
                    let data = response['data'];
                    if (data === null || data === undefined) {
                        return
                    }
                    let candlestick = data['candlestick'];
                    if (!Array.isArray(candlestick)) {
                        return klineArray
                    }
                    let ohlcv = candlestick[0]['ohlcv'];
                    if (!Array.isArray(ohlcv)) {
                        return klineArray
                    }
                    for (let i = 0; i < ohlcv.length; i++) {
                        let item = ohlcv[i];
                        klineArray.push([_symbol, convertToNumber(item[5]), convertToNumber(item[0]), convertToNumber(item[1]),
                            convertToNumber(item[2]), convertToNumber(item[3]), convertToNumber(item[4])]);
                    }
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let symbolObject = {};

            let markets_response = jsonFetch(this.spot_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            let dataArray = markets_response["data"]["pairs"];
            if (!Array.isArray(dataArray)) {
                return newDataObject
            }

            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item["stop_order"] === true) {
                    continue;
                }
                let _symbol = String(item["name"]);
                let BaseAsset = String(item["base_asset"]).toLowerCase();
                let QuoteAsset = String(item["quote_asset"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                symbolObject[_symbol] = Symbol;
            }
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, symbolObject, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 50, _symbol, alias, interval = '1d', begin = 1325260800000, limit = null) {
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // Websea
    class Websea {
        constructor() {
            this.spot_precision_markets_url = "https://oapi.websea.com/openApi/market/precision";
            this.swap_precision_markets_url = "https://coapi.websea.com/openApi/contract/precision";
            this.spot_markets_url = "https://oapi.websea.com/openApi/market/symbols";
            this.swap_markets_url = "https://coapi.websea.com/openApi/contract/symbols";
            this.spot_tickers_url = "https://oapi.websea.com/openApi/market/24kline";
            this.swap_tickers_url = "https://coapi.websea.com/openApi/contract/24kline";
            this.spot_klines_url = "https://oapi.websea.com/openApi/market/kline";
            this.swap_klines_url = "https://coapi.websea.com/openApi/contract/kline";
        }

        parseMarketsData(response, symbolType, precisionObject, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["result"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let _symbol = String(item["symbol"]);
                let Symbol = null;
                let Contract = null;
                let PricePrecision = null;
                let AmountPrecision = null;
                let TickSize = null;
                let AmountSize = null;
                let MinQty = null;
                let MaxQty = null;
                if (_symbol in precisionObject) {
                    PricePrecision = convertToNumber(precisionObject[_symbol]['price']);
                    AmountPrecision = convertToNumber(precisionObject[_symbol]['amount']);
                    TickSize = convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision));
                    AmountSize = convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision));
                    MinQty = convertToNumber(precisionObject[_symbol]['minQuantity']);
                    MaxQty = convertToNumber(precisionObject[_symbol]['maxQuantity']);
                }
                let BaseAsset = String(item["base_currency"]).toLowerCase();
                let QuoteAsset = String(item["quote_currency"]).toLowerCase();
                if (symbolType === 'spot') {
                    Symbol = BaseAsset + '_' + QuoteAsset;
                }
                else {
                    Contract = 'swap';
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: _symbol,
                    Contract: Contract,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: TickSize,
                    AmountSize: AmountSize,
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: MinQty,
                    MaxQty: MaxQty,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["result"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Symbol = null;
                if (symbolType === 'spot') {
                    Symbol = String(item["symbol"]).replace(/-/g, '_').toLowerCase();
                }
                else {
                    Symbol = String(item["symbol"]).replace(/-/g, '_').toLowerCase(); + '.swap';
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    High: convertToNumber(item["data"]["high"]),
                    Low: convertToNumber(item["data"]["low"]),
                    Sell: convertToNumber(item["ask"]),
                    Buy: convertToNumber(item["bid"]),
                    Last: convertToNumber(item["data"]["close"]),
                    Open: convertToNumber(item["data"]["open"]),
                    Volume: convertToNumber(item["data"]["amount"]),
                    QuoteVolume: convertToNumber(item["data"]["vol"]),
                    Time: null,
                    Info: item
                };
            }
        }

        parseKlinesData1(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 2000) {
                    limit = 2000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = '1min';
            }
            else if (interval === '15m') {
                _interval = '15min';
            }
            else {
                _interval = '1day';
            }
            let url = `${base_url}?symbol=${alias}&period=${_interval}&size=${limit}`;

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let result = response['result'];
                if (Object.prototype.toString.call(result) !== '[object Object]') {
                    return
                }
                let dataArray = result['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                dataArray.reverse();
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['id']) * 1000, convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['amount'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesData2(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }

            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 2000) {
                    limit = 2000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = '1min';
                endBegin = begin + (limit - 1) * 60;
            }
            else if (interval === '15m') {
                _interval = '15min';
                endBegin = begin + (limit - 1) * 900;
            }
            else {
                _interval = '1day';
                endBegin = begin + (limit - 1) * 86400;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&period=${_interval}&size=${limit}`;
            }
            else {
                let date_now = Math.floor(Date.now() / 1000);
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?symbol=${alias}&period=${_interval}&size=${limit}&start=${begin}&end=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let result = response['result'];
                if (Object.prototype.toString.call(result) !== '[object Object]') {
                    return
                }
                let dataArray = result['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                dataArray.reverse();
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['id']) * 1000, convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['amount'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let precision_response = jsonFetch(this.spot_precision_markets_url);
            if (precision_response === null) {
                return newDataObject
            }
            let precisionObject = precision_response["result"];
            if (Object.prototype.toString.call(precisionObject) !== '[object Object]') {
                return newDataObject
            }
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, 'spot', precisionObject, newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let precision_response = jsonFetch(this.swap_precision_markets_url);
            if (precision_response === null) {
                return newDataObject
            }
            let precisionObject = precision_response["result"];
            if (Object.prototype.toString.call(precisionObject) !== '[object Object]') {
                return
            }
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData(response, 'swap', precisionObject, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, 'spot', newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData(response, 'swap', newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 100, _symbol, alias, interval = '1d', begin = null, limit = 2000) {
            let klineArray = this.parseKlinesData1(this.spot_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 100, _symbol, alias, interval = '1d', begin = 1690819200000, limit = 2000) {
            while (true) {
                let klineArray = this.parseKlinesData2(this.swap_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // PointPay
    class PointPay {
        constructor() {
            this.spot_markets_url = "https://api.pointpay.io/api/v1/public/markets";
            this.spot_tickers_url = "https://api.pointpay.io/api/v1/public/tickers";
            this.spot_klines_url = "https://api.pointpay.io/api/v1/public/kline";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["result"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let TickSize = null;
                let AmountSize = null;
                let PricePrecision = convertToNumber(item['moneyPrec']);
                if (PricePrecision < 0) {
                    TickSize = convertToNumber(Math.pow(10, Math.abs(PricePrecision)));
                }
                else {
                    TickSize = convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision));
                }
                let AmountPrecision = convertToNumber(item['stockPrec']);
                if (AmountPrecision < 0) {
                    AmountSize = convertToNumber(Math.pow(10, Math.abs(AmountPrecision)));
                }
                else {
                    AmountSize = convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision));
                }
                let BaseAsset = String(item["stock"]).toLowerCase();
                let QuoteAsset = String(item["money"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['name']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: TickSize,
                    AmountSize: AmountSize,
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item['minAmount']),
                    MaxQty: convertToNumber(item['maxAmount']),
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            let symbolObject = response["result"];
            if (Object.prototype.toString.call(symbolObject) !== '[object Object]') {
                return
            }
            for (let _symbol in symbolObject) {
                let item = symbolObject[_symbol];
                let Symbol = String(_symbol).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(_symbol),
                    High: convertToNumber(item["ticker"]["high"]),
                    Low: convertToNumber(item["ticker"]["low"]),
                    Sell: convertToNumber(item["ticker"]["ask"]),
                    Buy: convertToNumber(item["ticker"]["bid"]),
                    Last: convertToNumber(item["ticker"]["last"]),
                    Open: convertToNumber(item["ticker"]["open"]),
                    Volume: convertToNumber(item["ticker"]["vol"]),
                    QuoteVolume: convertToNumber(item["ticker"]["deal"]),
                    Time: convertToNumber(item["at"]),
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }

            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1000) {
                    limit = 1000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = 60;
                endBegin = begin + (limit - 1) * 60;
            }
            else if (interval === '15m') {
                _interval = 900;
                endBegin = begin + (limit - 1) * 900;
            }
            else {
                _interval = 86400;
                endBegin = begin + (limit - 1) * 86400;
            }
            let url = null;
            if (begin === null) {
                return
            }
            else {
                let date_now = Math.floor(Date.now() / 1000);
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?market=${alias}&interval=${_interval}&start=${begin}&end=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let result = response['result'];
                if (Object.prototype.toString.call(result) !== '[object Object]') {
                    return
                }
                let dataArray = result['kline'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['time']) * 1000, convertToNumber(item['open']), convertToNumber(item['highest']),
                        convertToNumber(item['lowest']), convertToNumber(item['close']), convertToNumber(item['volume'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 50, _symbol, alias, interval = '1d', begin = 1625068800000, limit = 1000) {
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // Luno
    class Luno {
        constructor() {
            this.spot_markets_url = "https://api.luno.com/api/exchange/1/markets";
            this.spot_tickers_url = "https://api.luno.com/api/1/tickers";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["markets"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item["trading_status"] !== 'ACTIVE') {
                    continue;
                }
                let TickSize = null;
                let AmountSize = null;
                let PricePrecision = convertToNumber(item['price_scale']);
                if (PricePrecision < 0) {
                    TickSize = convertToNumber(Math.pow(10, Math.abs(PricePrecision)));
                }
                else {
                    TickSize = convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision));
                }
                let AmountPrecision = convertToNumber(item['volume_scale']);
                if (AmountPrecision < 0) {
                    AmountSize = convertToNumber(Math.pow(10, Math.abs(AmountPrecision)));
                }
                else {
                    AmountSize = convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision));
                }
                let BaseAsset = String(item["base_currency"]).toLowerCase();
                let QuoteAsset = String(item["counter_currency"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['market_id']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: TickSize,
                    AmountSize: AmountSize,
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item['min_volume']),
                    MaxQty: convertToNumber(item['max_volume']),
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["tickers"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item["status"] !== 'ACTIVE') {
                    continue;
                }
                let Symbol = String(item["pair"]).toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['pair']),
                    High: null,
                    Low: null,
                    Sell: convertToNumber(item["ask"]),
                    Buy: convertToNumber(item["bid"]),
                    Last: convertToNumber(item["last_trade"]),
                    Open: null,
                    Volume: convertToNumber(item["rolling_24_hour_volume"]),
                    QuoteVolume: null,
                    Time: convertToNumber(item["timestamp"]),
                    Info: item
                };
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }
    }

    // Indodax
    class Indodax {
        constructor() {
            this.spot_markets_url = "https://indodax.com/api/pairs";
            this.spot_tickers_url = "https://indodax.com/api/ticker_all";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let TickSize = null;
                let PricePrecision = convertToNumber(item['price_round']);
                if (PricePrecision < 0) {
                    TickSize = convertToNumber(Math.pow(10, Math.abs(PricePrecision)));
                }
                else {
                    TickSize = convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision));
                }
                let BaseAsset = String(item["traded_currency"]).toLowerCase();
                let QuoteAsset = String(item["base_currency"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: TickSize,
                    AmountSize: null,
                    PricePrecision: PricePrecision,
                    AmountPrecision: null,
                    MinQty: convertToNumber(item['trade_min_traded_currency']),
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            let symbolObject = response["tickers"];
            if (Object.prototype.toString.call(symbolObject) !== '[object Object]') {
                return
            }
            for (let _symbol in symbolObject) {
                let item = symbolObject[_symbol];
                let _volume = _symbol.split("_")[0];
                let Symbol = String(_symbol).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(_symbol),
                    High: convertToNumber(item["high"]),
                    Low: convertToNumber(item["low"]),
                    Sell: convertToNumber(item["sell"]),
                    Buy: convertToNumber(item["buy"]),
                    Last: convertToNumber(item["last"]),
                    Open: null,
                    Volume: convertToNumber(item[`vol_${_volume}`]),
                    QuoteVolume: convertToNumber(item["vol_idr"]),
                    Time: convertToNumber(item["server_time"]),
                    Info: item
                };
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }
    }

    // Currency
    class Currency {
        constructor() {
            this.spot_markets_url = "https://api-adapter.backend.currency.com/api/v2/exchangeInfo";
            this.swap_markets_url = "https://api-adapter.backend.currency.com/api/v2/exchangeInfo";
            this.spot_tickers_url = "https://api-adapter.backend.currency.com/api/v2/ticker/24hr";
            this.swap_tickers_url = "https://api-adapter.backend.currency.com/api/v2/ticker/24hr";
        }

        parseMarketsData(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["symbols"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                item["name"] = '';
                if (item["marketType"].toLowerCase() !== symbolType) {
                    continue;
                }
                if (item["status"] !== 'TRADING') {
                    continue;
                }
                let Symbol = null;
                let Contract = null;
                let AmountSize = null;
                let AmountPrecision = null;
                let MinQty = null;
                let MaxQty = null;
                let MinNotional = null;
                let MaxNotional = null;
                let filters = item["filters"];
                for (let j = 0; j < filters.length; j++) {
                    let temp_item = filters[j];
                    let filter_type = temp_item["filterType"];
                    if (filter_type == "LOT_SIZE") {
                        AmountSize = convertToNumber(temp_item["stepSize"]);
                        AmountPrecision = countDecimalPlaces(temp_item["stepSize"]);
                        MinQty = convertToNumber(temp_item["minQty"]);
                        MaxQty = convertToNumber(temp_item["maxQty"]);
                    }
                    else if (filter_type == "MIN_NOTIONAL") {
                        MinNotional = convertToNumber(temp_item["minNotional"]);
                        MaxNotional = convertToNumber(temp_item["maxNotional"]);
                    }
                }
                let BaseAsset = String(item["baseAsset"]).toLowerCase();
                let QuoteAsset = String(item["quoteAsset"]).toLowerCase();
                if (symbolType === 'spot') {
                    Symbol = BaseAsset + '_' + QuoteAsset;
                }
                else {
                    Contract = 'swap';
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: Contract,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item["tickSize"]),
                    AmountSize: AmountSize,
                    PricePrecision: countDecimalPlaces(item["tickSize"]),
                    AmountPrecision: AmountPrecision,
                    MinQty: MinQty,
                    MaxQty: MaxQty,
                    MinNotional: MinNotional,
                    MaxNotional: MaxNotional,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, symbolObject, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let _symbol = String(item["symbol"]).toLowerCase();
                if (!(_symbol in symbolObject)) {
                    continue;
                }
                let Symbol = symbolObject[_symbol];
                let Last = convertToNumber(item["lastPrice"]);
                let change = convertToNumber(item["priceChange"]);
                let Open = convertToNumber(Last - change).toFixed(countDecimalPlaces(Last));
                let High = convertToNumber(item["highPrice"]);
                let Low = convertToNumber(item["lowPrice"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    High: High,
                    Low: Low,
                    Sell: convertToNumber(item["askPrice"]),
                    Buy: convertToNumber(item["bbidPriceid"]),
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["volume"]),
                    QuoteVolume: convertToNumber(item["quoteVolume"]),
                    Time: convertToNumber(item["closeTime"]),
                    Info: item
                };
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, "spot", newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData(response, "leverage", newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let symbolObject = {};
            let market_response = jsonFetch(this.spot_tickers_url);
            if (market_response === null) {
                return
            }
            let dataArray = market_response["symbols"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                item["name"] = '';
                if (item["marketType"].toLowerCase() !== 'spot') {
                    continue;
                }
                if (item["status"] !== 'TRADING') {
                    continue;
                }
                let _symbol = String(item["symbol"]).toLowerCase();
                let BaseAsset = String(item["baseAsset"]).toLowerCase();
                let QuoteAsset = String(item["quoteAsset"]).toLowerCase();
                symbolObject[_symbol] = BaseAsset + '_' + QuoteAsset;
            }
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, symbolObject, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let symbolObject = {};
            let market_response = jsonFetch(this.spot_tickers_url);
            if (market_response === null) {
                return
            }
            let dataArray = market_response["symbols"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                item["name"] = '';
                if (item["marketType"].toLowerCase() !== 'leverage') {
                    continue;
                }
                if (item["status"] !== 'TRADING') {
                    continue;
                }
                let _symbol = String(item["symbol"]).toLowerCase();
                let BaseAsset = String(item["baseAsset"]).toLowerCase();
                let QuoteAsset = String(item["quoteAsset"]).toLowerCase();
                symbolObject[_symbol] = BaseAsset + '_' + QuoteAsset + '.swap';
            }
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData(response, symbolObject, newDataObject);
            return newDataObject
        }
    }

    // Coinlist
    class Coinlist {
        constructor() {
            this.spot_markets_url = "https://trade-api.coinlist.co/v1/symbols";
            this.spot_tickers_url = "https://trade-api.coinlist.co/v1/symbols/summary";
            this.spot_klines_url = "https://trade-api.coinlist.co/v1/symbols";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["symbols"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item['type'].toLowerCase() !== 'spot') {
                    continue;
                }
                let BaseAsset = String(item["base_currency"]).toLowerCase();
                let QuoteAsset = String(item["quote_currency"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item['minimum_price_increment']),
                    AmountSize: convertToNumber(item['minimum_size_increment']),
                    PricePrecision: countDecimalPlaces(item['minimum_price_increment']),
                    AmountPrecision: countDecimalPlaces(item['minimum_size_increment']),
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            if (Object.prototype.toString.call(response) !== '[object Object]') {
                return
            }
            for (let _symbol in response) {
                let item = response[_symbol];
                if (item['type'].toLowerCase() !== 'spot') {
                    continue;
                }
                let Last = convertToNumber(item["last_price"]);
                let change = convertToNumber(item["price_change_percent_24h"]);
                let Open = convertToNumber((Last * (1 - change * 0.01)).toFixed(countDecimalPlaces(Last)));
                let High = convertToNumber(item["highest_price_24h"]);
                let Low = convertToNumber(item["lowest_price_24h"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                let Symbol = String(_symbol).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(_symbol),
                    High: High,
                    Low: Low,
                    Sell: null,
                    Buy: null,
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["volume_base_24h"]),
                    QuoteVolume: convertToNumber(item["volume_quote_24h"]),
                    Time: null,
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 300) {
                    limit = 300;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = '1m';
                endBegin = begin + (limit - 1) * 60000;
            }
            else if (interval === '15m') {
                return
            }
            else {
                return
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}/${alias}/candles?granularity=${_interval}`;
            }
            else {
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                let beginDate = new Date(begin);
                let endBeginDate = new Date(endBegin);
                url = `${base_url}/${alias}/candles?granularity=${_interval}&start_time=${beginDate.toISOString()}&end_time=${endBeginDate.toISOString()}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['candles'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    let time = new Date(item[0]);
                    let timestamp = time.getTime();
                    klineArray.push([_symbol, timestamp, convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 300, _symbol, alias, interval = '1d', begin = 1590940800000, limit = 300) {
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // MAX
    class MAX {
        constructor() {
            this.spot_markets_url = "https://max-api.maicoin.com/api/v2/markets";
            this.spot_tickers_url = "https://max-api.maicoin.com/api/v2/tickers";
            this.spot_klines_url = "https://max-api.maicoin.com/api/v2/k";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let market_status = item['market_status'];
                if (market_status !== 'active') {
                    continue;
                }
                let TickSize = null;
                let AmountSize = null;
                let PricePrecision = convertToNumber(item['quote_unit_precision']);
                if (PricePrecision < 0) {
                    TickSize = convertToNumber(Math.pow(10, Math.abs(PricePrecision)));
                }
                else {
                    TickSize = convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision));
                }
                let AmountPrecision = convertToNumber(item['base_unit_precision']);
                if (AmountPrecision < 0) {
                    AmountSize = convertToNumber(Math.pow(10, Math.abs(AmountPrecision)));
                }
                else {
                    AmountSize = convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision));
                }
                let BaseAsset = String(item["base_unit"]).toLowerCase();
                let QuoteAsset = String(item["quote_unit"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['id']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: TickSize,
                    AmountSize: AmountSize,
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item['min_base_amount']),
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            if (Object.prototype.toString.call(response) !== '[object Object]') {
                return
            }
            for (let _symbol in response) {
                let item = response[_symbol];
                let Symbol = String(_symbol).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(_symbol),
                    High: convertToNumber(item["high"]),
                    Low: convertToNumber(item["low"]),
                    Sell: convertToNumber(item["sell"]),
                    Buy: convertToNumber(item["buy"]),
                    Last: convertToNumber(item["last"]),
                    Open: convertToNumber(item["open"]),
                    Volume: convertToNumber(item["vol"]),
                    QuoteVolume: null,
                    Time: convertToNumber(item["at"]),
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 2000) {
                    limit = 2000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = 1;
            }
            else if (interval === '15m') {
                _interval = 15;
            }
            else {
                _interval = 1440;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?market=${alias}&period=${_interval}&limit=${limit}`;
            }
            else {
                url = `${base_url}?market=${alias}&period=${_interval}&limit=${limit}&timestamp=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(item[0]) * 1000, convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject

        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 50, _symbol, alias, interval = '1d', begin = 1517414400000, limit = 2000) {
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // CoinEx
    class CoinEx {
        constructor() {
            this.spot_markets_url = "https://api.coinex.com/v2/spot/market";
            this.swap_markets_url = "https://api.coinex.com/v2/futures/market";
            this.spot_tickers_url = "https://api.coinex.com/v2/spot/ticker";
            this.swap_tickers_url = "https://api.coinex.com/v2/futures/ticker";
            this.spot_klines_url = "https://api.coinex.com/v2/spot/kline";
            this.swap_klines_url = "https://api.coinex.com/v2/futures/kline";
            this.index_url = "https://api.coinex.com/v2/futures/kline";
            this.funding_url = "https://api.coinex.com/v2/futures/funding-rate-history";
        }

        parseMarketsData(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Symbol = null;
                let Contract = null;
                let TickSize = null;
                let AmountSize = null;
                let PricePrecision = convertToNumber(item['quote_ccy_precision']);
                if (PricePrecision < 0) {
                    TickSize = convertToNumber(Math.pow(10, Math.abs(PricePrecision)));
                }
                else {
                    TickSize = convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision));
                }
                let AmountPrecision = convertToNumber(item['base_ccy_precision']);
                if (AmountPrecision < 0) {
                    AmountSize = convertToNumber(Math.pow(10, Math.abs(AmountPrecision)));
                }
                else {
                    AmountSize = convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision));
                }
                let BaseAsset = String(item["base_ccy"]).toLowerCase();
                let QuoteAsset = String(item["quote_ccy"]).toLowerCase();
                let CtVal = null;
                let CtValCcy = null;
                if (symbolType === 'spot') {
                    Symbol = BaseAsset + '_' + QuoteAsset;
                }
                else {
                    Contract = 'swap';
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                    if (QuoteAsset === 'usd') {
                        CtVal = 1;
                        CtValCcy = QuoteAsset;
                    }
                    else if (QuoteAsset === 'usdt' || QuoteAsset === 'usdc') {
                        CtVal = 1;
                        CtValCcy = BaseAsset;
                    }
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['market']),
                    Contract: Contract,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: TickSize,
                    AmountSize: AmountSize,
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item['min_amount']),
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: CtVal,
                    CtValCcy: CtValCcy,
                    Info: item
                };
            }
        }

        parseTickersData(response, symbolObject, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let _symbol = String(item['market']);
                if (!(_symbol in symbolObject)) {
                    continue;
                }
                let Symbol = symbolObject[_symbol];
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: _symbol,
                    High: convertToNumber(item["high"]),
                    Low: convertToNumber(item["low"]),
                    Sell: null,
                    Buy: null,
                    Last: convertToNumber(item["last"]),
                    Open: convertToNumber(item["open"]),
                    Volume: convertToNumber(item["volume"]),
                    QuoteVolume: convertToNumber(item["value"]),
                    Time: null,
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1000) {
                    limit = 1000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }

            let _interval = null;
            if (interval === '1m') {
                _interval = '1min';
            }
            else if (interval === '15m') {
                _interval = '15min';
            }
            else {
                _interval = '1day';
            }
            let url = `${base_url}?price_type=latest_price&market=${alias}&period=${_interval}&limit=${limit}`;

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['created_at']), convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['volume'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesIndexData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1000) {
                    limit = 1000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }

            let _interval = null;
            if (interval === '1m') {
                _interval = '1min';
            }
            else if (interval === '15m') {
                _interval = '15min';
            }
            else {
                _interval = '1day';
            }
            let url = `${base_url}?price_type=index_price&market=${alias}&period=${_interval}&limit=${limit}`;

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['created_at']), convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), 0]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesFundingData(base_url, _symbol, alias, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1000) {
                    limit = 1000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let url = null;
            let endBegin = null;
            if (begin === null) {
                url = `${base_url}?market=${alias}&limit=${limit}`;
            }
            else {
                endBegin = begin + (limit - 1) * 28800000;
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?market=${alias}&limit=${limit}&start_time=${begin}&end_time=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                dataArray.reverse();
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['funding_time']), convertToNumber(item['actual_funding_rate'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, 'spot', newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData(response, 'swap', newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let symbolObject = {};
            let markets_response = jsonFetch(this.spot_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            let dataArray = markets_response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = String(item["base_ccy"]).toLowerCase();
                let QuoteAsset = String(item["quote_ccy"]).toLowerCase();
                let _symbol = String(item['market']);
                symbolObject[_symbol] = BaseAsset + '_' + QuoteAsset;
            }
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, symbolObject, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let symbolObject = {};
            let markets_response = jsonFetch(this.swap_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            let dataArray = markets_response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = String(item["base_ccy"]).toLowerCase();
                let QuoteAsset = String(item["quote_ccy"]).toLowerCase();
                let _symbol = String(item['market']);
                symbolObject[_symbol] = BaseAsset + '_' + QuoteAsset + '.swap';
            }
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData(response, symbolObject, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 10, _symbol, alias, interval = '1d', begin = null, limit = 1000) {
            let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 10, _symbol, alias, interval = '1d', begin = null, limit = 1000) {
            let klineArray = this.parseKlinesData(this.swap_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(价格指数)
        fetchKlinesIndex(sleep = 10, _symbol, alias, interval = '1d', begin = null, limit = 1000) {
            let klineArray = this.parseKlinesIndexData(this.index_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(资金费率)
        fetchKlinesFunding(sleep = 10, _symbol, alias, begin = 1567267200000, limit = 1000) {
            while (true) {
                let klineArray = this.parseKlinesFundingData(this.funding_url, _symbol, alias, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // Cryptology
    class Cryptology {
        constructor() {
            this.spot_markets_url = "https://api-sandbox.cryptology.com/v1/public/get-trade-pairs";
            this.spot_tickers_url = "https://api-sandbox.cryptology.com/v1/public/get-24hrs-stat?trade_pair=";
            this.spot_klines_url = "https://api-sandbox.cryptology.com/v1/public/get-candles";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let PricePrecision = 8;
                let AmountPrecision = 8;
                let BaseAsset = String(item["base_currency"]).toLowerCase();
                let QuoteAsset = String(item["quoted_currency"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['trade_pair']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision)),
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, _symbol, newDataObject) {
            if (response === null) {
                return
            }
            let response_object = response["data"];
            if (Object.prototype.toString.call(response_object) !== '[object Object]') {
                return
            }
            try {
                let Symbol = String(_symbol).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(_symbol),
                    High: convertToNumber(response_object["high"]),
                    Low: convertToNumber(response_object["low"]),
                    Sell: null,
                    Buy: null,
                    Last: convertToNumber(response_object["last"]),
                    Open: convertToNumber(response_object["open"]),
                    Volume: convertToNumber(response_object["base_volume"]),
                    QuoteVolume: null,
                    Time: null,
                    Info: response_object
                };
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name}  Method: parseTickersData  Symbol: ${_symbol}`, String(error));
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }

            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 300) {
                    limit = 300;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = 'M1';
                endBegin = begin + (limit - 1) * 60;
            }
            else if (interval === '15m') {
                return
            }
            else {
                _interval = 'D1';
                endBegin = begin + (limit - 1) * 86400;
            }
            let url = null;
            if (begin === null) {
                return
            }
            else {
                let date_now = Math.floor(Date.now() / 1000);
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?trade_pair=${alias}&interval=${_interval}&start=${begin}&end=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['time']) * 1000, convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['base_volume'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let markets_response = jsonFetch(this.spot_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            let dataArray = markets_response["data"];
            if (!Array.isArray(dataArray)) {
                return newDataObject
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let response = jsonFetch(this.spot_tickers_url + item['trade_pair']);
                this.parseTickersData(response, item['trade_pair'], newDataObject);
                Sleep(1000);
            }
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 1000, _symbol, alias, interval = '1d', begin = 1615939200000, limit = 300) {
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // CEXIO
    class CEXIO {
        constructor() {
            this.spot_markets_url = "https://trade.cex.io/api/spot/rest-public/get_pairs_info";
            this.spot_tickers_url = "https://trade.cex.io/api/spot/rest-public/get_ticker";
            this.spot_klines_url = "https://trade.cex.io/api/spot/rest-public/get_candles";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = String(item['base']).toLowerCase();
                let QuoteAsset = String(item['quote']).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['base']) + '-' + String(item['quote']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item['quoteLotSize']),
                    AmountSize: convertToNumber(item['baseLotSize']),
                    PricePrecision: convertToNumber(item['pricePrecision']),
                    AmountPrecision: convertToNumber(item['quotePrecision']),
                    MinQty: convertToNumber(item['baseMin']),
                    MaxQty: convertToNumber(item['baseMax']),
                    MinNotional: convertToNumber(item['quoteMin']),
                    MaxNotional: convertToNumber(item['quoteMax']),
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            let symbolObject = response["data"];
            if (Object.prototype.toString.call(symbolObject) !== '[object Object]') {
                return
            }
            for (let _symbol in symbolObject) {
                let item = symbolObject[_symbol];
                let Last = convertToNumber(item["last"]);
                let change = convertToNumber(item["priceChange"]);
                let Open = convertToNumber(Last - change).toFixed(countDecimalPlaces(Last));
                let High = convertToNumber(item["high"]);
                let Low = convertToNumber(item["low"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                let Symbol = String(_symbol).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(_symbol),
                    High: High,
                    Low: Low,
                    Sell: convertToNumber(item["bestAsk"]),
                    Buy: convertToNumber(item["bestBid"]),
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["volume"]),
                    QuoteVolume: convertToNumber(item["quoteVolume"]),
                    Time: convertToNumber(Date.parse(item["lastTradeDateISO"])),
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 300) {
                    limit = 300;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = '1m';
                endBegin = begin + (limit - 1) * 60000;
            }
            else if (interval === '15m') {
                _interval = '15m';
                endBegin = begin + (limit - 1) * 900000;
            }
            else {
                _interval = '1d';
                endBegin = begin + (limit - 1) * 86400000;
            }
            let url = null;
            if (begin === null) {
                return
            }
            else {
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?pair=${alias}&resolution=${_interval}&fromISO=${begin}&toISO=${endBegin}&dataType=bestAsk`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['time']), convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['base_volume'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 1000, _symbol, alias, interval = '1d', begin = 1615939200000, limit = 300) {
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // Fairdesk
    class Fairdesk {
        constructor() {
            this.spot_markets_url = "https://api.fairdesk.com/api/v1/public/spot-products";
            this.swap_markets_url = "https://api.fairdesk.com/api/v1/public/products";
            this.spot_tickers_url = "https://api.fairdesk.com/api/v1/public/spot/tickers";
            this.swap_tickers_url = "https://api.fairdesk.com/api/v1/public/md/ticker24h?symbol=";
            this.swap_klines_url = "https://api.fairdesk.com/api/v1/public/md/kline";
        }

        parseMarketsData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = String(item['baseCcyName']).toLowerCase();
                let QuoteAsset = String(item['quoteCcyName']).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['name']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item['tickSize']),
                    AmountSize: convertToNumber(item['stepSize']),
                    PricePrecision: countDecimalPlaces(item['tickSize']),
                    AmountPrecision: countDecimalPlaces(item['stepSize']),
                    MinQty: convertToNumber(item['minOrderQty']),
                    MaxQty: convertToNumber(item['maxOrderQty']),
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseMarketsData2(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = String(item['baseCurrency']).toLowerCase();
                let QuoteAsset = String(item['quoteCurrency']).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: 'swap',
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item['tickSize']),
                    AmountSize: convertToNumber(item['stepSize']),
                    PricePrecision: convertToNumber(item['priceDecimal']),
                    AmountPrecision: convertToNumber(item['amountDecimal']),
                    MinQty: convertToNumber(item['minOrderQty']),
                    MaxQty: convertToNumber(item['maxOrderQty']),
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["result"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Symbol = String(item['ticker_id']).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['ticker_id']),
                    High: convertToNumber(item["high"]),
                    Low: convertToNumber(item["low"]),
                    Sell: convertToNumber(item["ask"]),
                    Buy: convertToNumber(item["bid"]),
                    Last: convertToNumber(item["last_price"]),
                    Open: null,
                    Volume: convertToNumber(item["base_volume"]),
                    QuoteVolume: convertToNumber(item["target_volume"]),
                    Time: null,
                    Info: item
                };
            }
        }

        parseTickersData2(response, _symbol, newDataObject) {
            if (response === null) {
                return
            }
            if (Object.prototype.toString.call(response) !== '[object Object]') {
                return
            }
            try {
                let item = response["data"];
                newDataObject[_symbol] = {
                    Symbol: _symbol,
                    Alias: String(item['symbol']),
                    High: convertToNumber(item["high"]),
                    Low: convertToNumber(item["low"]),
                    Sell: convertToNumber(item["ask"]),
                    Buy: convertToNumber(item["bid"]),
                    Last: convertToNumber(item["close"]),
                    Open: convertToNumber(item["open"]),
                    Volume: convertToNumber(item["baseVolume"]),
                    QuoteVolume: convertToNumber(item["quoteVolume"]),
                    Time: convertToNumber(item["timestamp"]),
                    Info: item
                };
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name}  Method: parseTickersData2  Symbol: ${_symbol}`, String(error));
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 500) {
                    limit = 500;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = '1m';
                endBegin = begin + (limit - 1) * 60000;

            }
            else if (interval === '15m') {
                _interval = '15m';
                endBegin = begin + (limit - 1) * 900000;
            }
            else {
                _interval = '1d';
                endBegin = begin + (limit - 1) * 86400000;
            }
            let url = null;
            if (begin === null) {
                return
            }
            else {
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?symbol=${alias}&interval=${_interval}&limit=${limit}&from=${begin}&to=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['openTime']), convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['volume'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData1(response, newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData2(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData1(response, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let markets_response = jsonFetch(this.swap_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            let dataArray = markets_response["data"];
            if (!Array.isArray(dataArray)) {
                return newDataObject
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = String(item['baseCurrency']).toLowerCase();
                let QuoteAsset = String(item['quoteCurrency']).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                let response = jsonFetch(this.swap_tickers_url + item["symbol"]);
                this.parseTickersData2(response, Symbol, newDataObject);
                Sleep(50);
            }
            return newDataObject
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 100, _symbol, alias, interval = '1d', begin = 1567267200000, limit = 500) {
            while (true) {
                let klineArray = this.parseKlinesData(this.swap_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // Independent
    class Independent {
        constructor() {
            this.spot_markets_urls = [
                "https://api.independentreserve.com/Public/GetPrimaryCurrencyConfig",
                "https://api.independentreserve.com/Public/GetValidSecondaryCurrencyCodes",
                "https://api.independentreserve.com/Public/GetOrderMinimumVolumes"
            ];
            this.spot_tickers_url = "https://api.independentreserve.com/Public/GetMarketSummary";
        }

        parseMarketsData(responseArray, newDataObject) {
            if (!Array.isArray(responseArray)) {
                return
            }
            for (let i = 0; i < responseArray[0].length; i++) {
                let item = responseArray[0][i];
                let BaseAsset = String(item['Code']).toLowerCase();
                for (let j = 0; j < responseArray[1].length; j++) {
                    let QuoteAsset = String(responseArray[1][j]).toLowerCase();
                    let TickSize = null;
                    let AmountSize = null;
                    let PricePrecision = convertToNumber(item['DecimalPlaces']['OrderSecondaryCurrency']);
                    if (PricePrecision < 0) {
                        TickSize = convertToNumber(Math.pow(10, Math.abs(PricePrecision)));
                    }
                    else {
                        TickSize = convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision));
                    }
                    let AmountPrecision = convertToNumber(item['DecimalPlaces']['OrderPrimaryCurrency']);
                    if (AmountPrecision < 0) {
                        AmountSize = convertToNumber(Math.pow(10, Math.abs(AmountPrecision)));
                    }
                    else {
                        AmountSize = convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision));
                    }
                    let Symbol = BaseAsset + '_' + QuoteAsset;
                    newDataObject[Symbol] = {
                        Symbol: Symbol,
                        Alias: String(item['Code']) + String(responseArray[1][j]),
                        Contract: null,
                        BaseAsset: BaseAsset,
                        QuoteAsset: QuoteAsset,
                        TickSize: TickSize,
                        AmountSize: AmountSize,
                        PricePrecision: PricePrecision,
                        AmountPrecision: AmountPrecision,
                        MinQty: convertToNumber(responseArray[2][item['Code']]),
                        MaxQty: null,
                        MinNotional: null,
                        MaxNotional: null,
                        CtVal: null,
                        CtValCcy: null,
                        Info: item
                    };
                }
            }
        }

        parseTickersData(response, _symbol, newDataObject) {
            if (response === null) {
                return
            }
            if (Object.prototype.toString.call(response) !== '[object Object]') {
                return
            }
            try {
                let BaseAsset = String(response["PrimaryCurrencyCode"]).toLowerCase();
                let QuoteAsset = String(response["SecondaryCurrencyCode"]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: _symbol,
                    High: convertToNumber(response["DayHighestPrice"]),
                    Low: convertToNumber(response["DayLowestPrice"]),
                    Sell: null,
                    Buy: null,
                    Last: convertToNumber(response["LastPrice"]),
                    Open: null,
                    Volume: convertToNumber(response["DayVolumeXbt"]),
                    QuoteVolume: null,
                    Time: convertToNumber(Date.parse(response["CreatedTimestampUtc"])),
                    Info: response
                };
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name}  Method: parseTickersData  Symbol: ${_symbol}`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let baseSymbol = jsonFetch(this.spot_markets_urls[0]);
            let quoteSymbol = jsonFetch(this.spot_markets_urls[1]);
            let minimum = jsonFetch(this.spot_markets_urls[2]);
            if (baseSymbol === null || quoteSymbol === null || minimum === null) {
                return newDataObject
            }
            if (!Array.isArray(baseSymbol)) {
                return newDataObject
            }
            if (!Array.isArray(quoteSymbol)) {
                return newDataObject
            }
            if (Object.prototype.toString.call(minimum) !== '[object Object]') {
                return newDataObject
            }
            this.parseMarketsData([baseSymbol, quoteSymbol, minimum], newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let baseSymbol = jsonFetch(this.spot_markets_urls[0]);
            let quoteSymbol = jsonFetch(this.spot_markets_urls[1]);
            if (baseSymbol === null || quoteSymbol === null) {
                return newDataObject
            }
            if (!Array.isArray(baseSymbol)) {
                return newDataObject
            }
            if (!Array.isArray(quoteSymbol)) {
                return newDataObject
            }
            for (let i = 0; i < baseSymbol.length; i++) {
                let item = baseSymbol[i];
                let BaseAsset = String(item['Code']);
                for (let j = 0; j < quoteSymbol.length; j++) {
                    let QuoteAsset = String(quoteSymbol[j]);
                    let url = this.spot_tickers_url + "?primaryCurrencyCode=" + BaseAsset + "&secondaryCurrencyCode=" + QuoteAsset;
                    let response = jsonFetch(url);
                    let _symbol = BaseAsset + QuoteAsset;
                    this.parseTickersData(response, _symbol, newDataObject);
                    Sleep(1000);
                }
            }
            return newDataObject
        }
    }

    // Bullish
    class Bullish {
        constructor() {
            this.spot_markets_url = "https://api.exchange.bullish.com/trading-api/v1/markets";
            this.swap_markets_url = "https://api.exchange.bullish.com/trading-api/v1/markets";
            this.spot_tickers_url = "https://api.exchange.bullish.com/trading-api/v1/markets";
            this.swap_tickers_url = "https://api.exchange.bullish.com/trading-api/v1/markets";
        }

        parseMarketsData(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                if (item["marketType"].toLowerCase() !== symbolType) {
                    continue;
                }
                let BaseAsset = String(item['baseSymbol']).toLowerCase();
                let QuoteAsset = String(item['quoteSymbol']).toLowerCase();
                let Symbol = null;
                let Contract = null;
                if (symbolType === 'spot') {
                    Symbol = BaseAsset + '_' + QuoteAsset;
                }
                else {
                    Contract = 'swap';
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: Contract,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item['tickSize']),
                    AmountSize: convertToNumber(item['liquidityTickSize']),
                    PricePrecision: countDecimalPlaces(item['tickSize']),
                    AmountPrecision: countDecimalPlaces(item['liquidityTickSize']),
                    MinQty: convertToNumber(item['minQuantityLimit']),
                    MaxQty: convertToNumber(item['maxQuantityLimit']),
                    MinNotional: convertToNumber(item['minCostLimit']),
                    MaxNotional: convertToNumber(item['maxCostLimit']),
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, _symbol, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            newDataObject[_symbol] = {
                Symbol: _symbol,
                Alias: String(item['symbol']),
                High: convertToNumber(response["high"]),
                Low: convertToNumber(response["low"]),
                Sell: convertToNumber(response["bestAsk"]),
                Buy: convertToNumber(response["bestBid"]),
                Last: convertToNumber(response["last"]),
                Open: convertToNumber(response["open"]),
                Volume: convertToNumber(response["baseVolume"]),
                QuoteVolume: convertToNumber(response["quoteVolume"]),
                Time: convertToNumber(Date.parse(response["createdAtDatetime"])),
                Info: response
            };
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, "spot", newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData(response, "perpetual", newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let markets_response = jsonFetch(this.spot_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            if (!Array.isArray(markets_response)) {
                return newDataObject
            }
            for (let i = 0; i < markets_response.length; i++) {
                let item = markets_response[i];
                if (item["marketType"].toLowerCase() === "spot") {
                    let BaseAsset = String(item['baseSymbol']).toLowerCase();
                    let QuoteAsset = String(item['quoteSymbol']).toLowerCase();
                    let _symbol = BaseAsset + '_' + QuoteAsset;
                    let response = jsonFetch(this.spot_tickers_url + "/" + item['symbol'] + "/tick");
                    this.parseTickersData(response, _symbol, newDataObject);
                }
            }
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let markets_response = jsonFetch(this.swap_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            if (!Array.isArray(markets_response)) {
                return newDataObject
            }
            for (let i = 0; i < markets_response.length; i++) {
                let item = markets_response[i];
                if (item["marketType"].toLowerCase() === "perpetual") {
                    let BaseAsset = String(item['baseSymbol']).toLowerCase();
                    let QuoteAsset = String(item['quoteSymbol']).toLowerCase();
                    let _symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                    let response = jsonFetch(this.swap_tickers_url + "/" + item['symbol'] + "/tick");
                    this.parseTickersData(response, _symbol, newDataObject);
                }
            }
            return newDataObject
        }
    }

    // Poloniex
    class Poloniex {
        constructor() {
            this.spot_markets_url = "https://api.poloniex.com/markets";
            this.swap_markets_url = "https://futures-api.poloniex.com/api/v1/contracts/active";
            this.spot_tickers_url = "https://api.poloniex.com/markets/ticker24h";
            this.swap_tickers_url = "https://api.poloniex.com/v3/market/tickers";
            this.spot_klines_url = "https://api.poloniex.com/markets";
            this.swap_klines_url = "https://api.poloniex.com/v3/market/candles";
            this.index_url = "https://api.poloniex.com/v3/market/indexPriceCandlesticks";
            this.funding_url = "https://api.poloniex.com/v3/market/fundingRate/hitsory";
        }

        parseMarketsData1(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                if (item['state'] !== 'NORMAL') {
                    continue;
                }
                let TickSize = null;
                let AmountSize = null;
                let PricePrecision = convertToNumber(item['symbolTradeLimit']['priceScale']);
                if (PricePrecision < 0) {
                    TickSize = convertToNumber(Math.pow(10, Math.abs(PricePrecision)));
                }
                else {
                    TickSize = convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision));
                }
                let AmountPrecision = convertToNumber(item['symbolTradeLimit']['quantityScale']);
                if (AmountPrecision < 0) {
                    AmountSize = convertToNumber(Math.pow(10, Math.abs(AmountPrecision)));
                }
                else {
                    AmountSize = convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision));
                }
                let BaseAsset = String(item['baseCurrencyName']).toLowerCase();
                let QuoteAsset = String(item['quoteCurrencyName']).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: TickSize,
                    AmountSize: AmountSize,
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item['symbolTradeLimit']['minQuantity']),
                    MaxQty: null,
                    MinNotional: convertToNumber(item['symbolTradeLimit']['minAmount']),
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseMarketsData2(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = String(item['baseCurrency']).toLowerCase();
                let QuoteAsset = String(item['quoteCurrency']).toLowerCase();
                let CtValCcy = null;
                if (QuoteAsset === 'usdt') {
                    CtValCcy = BaseAsset;
                }
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: 'swap',
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item['tickSize']),
                    AmountSize: convertToNumber(item['lotSize']),
                    PricePrecision: countDecimalPlaces(item['tickSize']),
                    AmountPrecision: countDecimalPlaces(item['lotSize']),
                    MinQty: convertToNumber(item['minOrderQty']),
                    MaxQty: convertToNumber(item['maxOrderQty']),
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: convertToNumber(item['multiplier']),
                    CtValCcy: CtValCcy,
                    Info: item
                };
            }
        }

        parseTickersData1(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let Symbol = String(item['symbol']).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    High: convertToNumber(item["high"]),
                    Low: convertToNumber(item["low"]),
                    Sell: convertToNumber(item["ask"]),
                    Buy: convertToNumber(item["bid"]),
                    Last: convertToNumber(item["close"]),
                    Open: convertToNumber(item["open"]),
                    Volume: convertToNumber(item["quantity"]),
                    QuoteVolume: convertToNumber(item["amount"]),
                    Time: convertToNumber(item["ts"]),
                    Info: item
                };
            }
        }

        parseTickersData2(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let symbol_list = String(item['s']).replace(/-/g, '_').toLowerCase().split('_');
                let Symbol = symbol_list[0] + '_' + symbol_list[1] + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['s']),
                    High: convertToNumber(item["h"]),
                    Low: convertToNumber(item["l"]),
                    Sell: convertToNumber(item["aPx"]),
                    Buy: convertToNumber(item["bPx"]),
                    Last: convertToNumber(item["c"]),
                    Open: convertToNumber(item["o"]),
                    Volume: convertToNumber(item["qty"]),
                    QuoteVolume: convertToNumber(item["amt"]),
                    Time: convertToNumber(item["cT"]),
                    Info: item
                };
            }
        }

        parseKlinesData1(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 500) {
                    limit = 500;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = 'MINUTE_1';
                endBegin = begin + (limit - 1) * 60000;
            }
            else if (interval === '15m') {
                _interval = 'MINUTE_15';
                endBegin = begin + (limit - 1) * 900000;
            }
            else {
                _interval = 'DAY_1';
                endBegin = begin + (limit - 1) * 86400000;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}/${alias}/candles?interval=${_interval}&limit=${limit}`;
            }
            else {
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}/${alias}/candles?interval=${_interval}&limit=${limit}&startTime=${begin}&endTime=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (Object.prototype.toString.call(response) === '[object Object]') {
                    let code = response['code'];
                    if (code === 404) {
                        return klineArray
                    }
                }
                if (!Array.isArray(response)) {
                    return
                }
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(item[12]), convertToNumber(item[2]), convertToNumber(item[1]),
                        convertToNumber(item[0]), convertToNumber(item[3]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesData2(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 500) {
                    limit = 500;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = 'MINUTE_1';
                endBegin = begin + (limit - 1) * 60000;
            }
            else if (interval === '15m') {
                _interval = 'MINUTE_15';
                endBegin = begin + (limit - 1) * 900000;
            }
            else {
                _interval = 'DAY_1';
                endBegin = begin + (limit - 1) * 86400000;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&interval=${_interval}&limit=${limit}`;
            }
            else {
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?symbol=${alias}&interval=${_interval}&limit=${limit}&startTime=${begin}&endTime=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let code = response['code'];
                if (code === 404) {
                    return klineArray
                }
                let dataArray = response["data"];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item[7]), convertToNumber(item[2]), convertToNumber(item[1]),
                        convertToNumber(item[0]), convertToNumber(item[3]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesIndexData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 100) {
                    limit = 100;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = 'MINUTE_1';
                endBegin = begin + (limit - 1) * 60000;
            }
            else if (interval === '15m') {
                _interval = 'MINUTE_15';
                endBegin = begin + (limit - 1) * 900000;
            }
            else {
                _interval = 'DAY_1';
                endBegin = begin + (limit - 1) * 86400000;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&interval=${_interval}&limit=${limit}`;
            }
            else {
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?symbol=${alias}&interval=${_interval}&limit=${limit}&sTime=${begin}&eTime=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let code = response['code'];
                if (code === 404) {
                    return klineArray
                }
                let dataArray = response["data"];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item[4]), convertToNumber(item[2]), convertToNumber(item[1]),
                        convertToNumber(item[0]), convertToNumber(item[3]), 0]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesFundingData(base_url, _symbol, alias, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1000) {
                    limit = 1000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let url = null;
            let endBegin = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&limit=${limit}`;
            }
            else {
                endBegin = begin + (limit - 1) * 28800000;
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?symbol=${alias}&limit=${limit}&sT=${begin}&eT=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let code = response['code'];
                if (code === 404) {
                    return klineArray
                }
                let dataArray = response["data"];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['fT']), convertToNumber(item['fR'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData1(response, newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData2(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData1(response, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData2(response, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 50, _symbol, alias, interval = '1d', begin = 1422720000000, limit = 500) {
            while (true) {
                let klineArray = this.parseKlinesData1(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 50, _symbol, alias, interval = '1d', begin = 1672502400000, limit = 500) {
            while (true) {
                let klineArray = this.parseKlinesData2(this.swap_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(价格指数)
        fetchKlinesIndex(sleep = 50, _symbol, alias, interval = '1d', begin = 1596211200000, limit = 100) {
            while (true) {
                let klineArray = this.parseKlinesIndexData(this.index_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(资金费率)
        fetchKlinesFunding(sleep = 50, _symbol, alias, begin = 1577808000000, limit = 1000) {
            while (true) {
                let klineArray = this.parseKlinesFundingData(this.funding_url, _symbol, alias, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // AscendEx
    class AscendEx {
        constructor() {
            this.spot_markets_url = "https://ascendex.com/api/pro/v1/cash/products";
            this.swap_markets_url = "https://ascendex.com/api/pro/v2/futures/contract";
            this.spot_tickers_url = "https://ascendex.com/api/pro/v1/spot/ticker";
            this.swap_tickers_url = "https://ascendex.com/api/pro/v2/futures/ticker";
            this.spot_klines_url = "https://ascendex.com/api/pro/v1/barhist";
            this.swap_klines_url = "https://ascendex.com/api/pro/v1/barhist";
        }

        parseMarketsData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item['statusCode'] !== 'Normal') {
                    continue;
                }
                let Symbol = String(item['symbol']).replace('/', '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: Symbol.split('_')[0],
                    QuoteAsset: Symbol.split('_')[1],
                    TickSize: convertToNumber(item['tickSize']),
                    AmountSize: convertToNumber(item['lotSize']),
                    PricePrecision: countDecimalPlaces(item['tickSize']),
                    AmountPrecision: countDecimalPlaces(item['lotSize']),
                    MinQty: convertToNumber(item['minQty']),
                    MaxQty: convertToNumber(item['maxQty']),
                    MinNotional: convertToNumber(item['minNotional']),
                    MaxNotional: convertToNumber(item['maxNotional']),
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseMarketsData2(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item['status'] !== 'Normal') {
                    continue;
                }
                let symbol_list = String(item['underlying']).toLowerCase().split('/');
                let BaseAsset = symbol_list[0];
                let QuoteAsset = symbol_list[1];
                let CtVal = null;
                let CtValCcy = null;
                if (QuoteAsset === 'usdt') {
                    CtVal = 1;
                    CtValCcy = BaseAsset;
                }
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['underlying']),
                    Contract: 'swap',
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item['priceFilter']['tickSize']),
                    AmountSize: convertToNumber(item['lotSizeFilter']['lotSize']),
                    PricePrecision: countDecimalPlaces(item['priceFilter']['tickSize']),
                    AmountPrecision: countDecimalPlaces(item['lotSizeFilter']['lotSize']),
                    MinQty: countDecimalPlaces(item['lotSizeFilter']['minQty']),
                    MaxQty: countDecimalPlaces(item['lotSizeFilter']['maxQty']),
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: CtVal,
                    CtValCcy: CtValCcy,
                    Info: item
                };
            }
        }

        parseTickersData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item["type"].toLowerCase() !== "spot") {
                    continue;
                }
                let Symbol = String(item['symbol']).replace('/', '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    High: convertToNumber(item["high"]),
                    Low: convertToNumber(item["low"]),
                    Sell: convertToNumber(item["ask"][0]),
                    Buy: convertToNumber(item["bid"][0]),
                    Last: convertToNumber(item["close"]),
                    Open: convertToNumber(item["open"]),
                    Volume: convertToNumber(item["volume"]),
                    QuoteVolume: null,
                    Time: null,
                    Info: item
                };
            }
        }

        parseTickersData2(response, symbolObject, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let _symbol = String(item['symbol']);
                if (!(_symbol in symbolObject)) {
                    continue;
                }
                let Symbol = symbolObject[_symbol];
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    High: convertToNumber(item["high"]),
                    Low: convertToNumber(item["low"]),
                    Sell: convertToNumber(item["ask"][0]),
                    Buy: convertToNumber(item["bid"][0]),
                    Last: convertToNumber(item["close"]),
                    Open: convertToNumber(item["open"]),
                    Volume: convertToNumber(item["baseVol"]),
                    QuoteVolume: null,
                    Time: null,
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 500) {
                    limit = 500;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = 1;
                endBegin = begin + (limit - 1) * 60000;
            }
            else if (interval === '15m') {
                _interval = 15;
                endBegin = begin + (limit - 1) * 900000;
            }
            else {
                _interval = '1d';
                endBegin = begin + (limit - 1) * 86400000;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&interval=${_interval}&n=${limit}`;
            }
            else {
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?symbol=${alias}&interval=${_interval}&n=${limit}&from=${begin}&to=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['data']['ts']), convertToNumber(item['data']['o']), convertToNumber(item['data']['h']),
                        convertToNumber(item['data']['l']), convertToNumber(item['data']['c']), convertToNumber(item['data']['v'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData1(response, newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData2(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData1(response, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let symbolObject = {};
            let markets_response = jsonFetch(this.swap_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            let dataArray = markets_response["data"];
            if (!Array.isArray(dataArray)) {
                return newDataObject
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let _symbol = String(item['symbol']);
                let symbol_list = String(item['underlying']).toLowerCase().split('/');
                symbolObject[_symbol] = symbol_list[0] + '_' + symbol_list[1] + '.swap';
            }
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData2(response, symbolObject, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 100, _symbol, alias, interval = '1d', begin = 1533052800000, limit = 500) {
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 100, _symbol, alias, interval = '1d', begin = 1577808000000, limit = 500) {
            while (true) {
                let klineArray = this.parseKlinesData(this.swap_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // OKCoin
    class OKCoin {
        constructor() {
            this.spot_markets_url = "https://www.okcoin.jp/api/spot/v3/instruments";
            this.spot_tickers_url = "https://www.okcoin.jp/api/spot/v3/instruments/ticker";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let Symbol = String(item['instrument_id']).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['instrument_id']),
                    Contract: null,
                    BaseAsset: item['base_currency'].toLowerCase(),
                    QuoteAsset: item['quote_currency'].toLowerCase(),
                    TickSize: convertToNumber(item['tick_size']),
                    AmountSize: convertToNumber(item['size_increment']),
                    PricePrecision: countDecimalPlaces(item['tick_size']),
                    AmountPrecision: countDecimalPlaces(item['size_increment']),
                    MinQty: convertToNumber(item['min_size']),
                    MaxQty: convertToNumber(item['max_size']),
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let Symbol = String(item['instrument_id']).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['instrument_id']),
                    High: convertToNumber(item["high_24h"]),
                    Low: convertToNumber(item["low_24h"]),
                    Sell: convertToNumber(item["ask"]),
                    Buy: convertToNumber(item["bid"]),
                    Last: convertToNumber(item["last"]),
                    Open: convertToNumber(item["open_24h"]),
                    Volume: convertToNumber(item["base_volume_24h"]),
                    QuoteVolume: convertToNumber(item["quote_volume_24h"]),
                    Time: convertToNumber(Date.parse(item["timestamp"])),
                    Info: item
                };
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }
    }

    // FMFWIO
    class FMFWIO {
        constructor() {
            this.spot_markets_url = "https://api.fmfw.io/api/3/public/symbol";
            this.swap_markets_url = "https://api.fmfw.io/api/3/public/symbol";
            this.spot_tickers_url = "https://api.fmfw.io/api/3/public/ticker";
            this.swap_tickers_url = "https://api.fmfw.io/api/3/public/ticker";
        }

        parseMarketsData(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            if (Object.prototype.toString.call(response) !== '[object Object]') {
                return
            }
            for (let _symbol in response) {
                let item = response[_symbol];
                if (item["type"].toLowerCase() !== symbolType) {
                    continue;
                }
                if (item["status"] !== 'working') {
                    continue;
                }
                let Symbol = null;
                let Contract = null;
                let BaseAsset = null;
                let QuoteAsset = null
                if (symbolType === 'spot') {
                    BaseAsset = String(item['base_currency']).toLowerCase();
                    QuoteAsset = String(item['quote_currency']).toLowerCase();
                    Symbol = BaseAsset + '_' + QuoteAsset;
                }
                else {
                    BaseAsset = String(item['underlying']).toLowerCase();
                    QuoteAsset = String(item['quote_currency']).toLowerCase();
                    Contract = 'swap';
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(_symbol),
                    Contract: Contract,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item['tick_size']),
                    AmountSize: convertToNumber(item['quantity_increment']),
                    PricePrecision: countDecimalPlaces(item['tick_size']),
                    AmountPrecision: countDecimalPlaces(item['quantity_increment']),
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData1(response, newDataObject) {
            if (response === null) {
                return
            }
            if (Object.prototype.toString.call(response) !== '[object Object]') {
                return
            }
            for (let _symbol in response) {
                let item = response[_symbol];
                if (_symbol.toLowerCase().slice(-4) === "PERP") {
                    continue;
                }
                let Symbol = String(_symbol).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(_symbol),
                    High: convertToNumber(item["high"]),
                    Low: convertToNumber(item["low"]),
                    Sell: convertToNumber(item["ask"]),
                    Buy: convertToNumber(item["bid"]),
                    Last: convertToNumber(item["last"]),
                    Open: convertToNumber(item["open"]),
                    Volume: convertToNumber(item["volume"]),
                    QuoteVolume: convertToNumber(item["volume_quote"]),
                    Time: convertToNumber(Date.parse(item["timestamp"])),
                    Info: item
                };
            }
        }

        parseTickersData2(response, newDataObject) {
            if (response === null) {
                return
            }
            if (Object.prototype.toString.call(response) !== '[object Object]') {
                return
            }
            for (let _symbol in response) {
                let item = response[_symbol];
                if (_symbol.toLowerCase().slice(-4) !== "PERP") {
                    continue;
                }
                let Symbol = String(_symbol).replace(/-/g, '_').toLowerCase() + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(_symbol),
                    High: convertToNumber(item["high"]),
                    Low: convertToNumber(item["low"]),
                    Sell: convertToNumber(item["ask"]),
                    Buy: convertToNumber(item["bid"]),
                    Last: convertToNumber(item["last"]),
                    Open: convertToNumber(item["open"]),
                    Volume: convertToNumber(item["volume"]),
                    QuoteVolume: convertToNumber(item["volume_quote"]),
                    Time: convertToNumber(Date.parse(item["timestamp"])),
                    Info: item
                };
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, "spot", newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData(response, "futures", newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData1(response, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData2(response, newDataObject);
            return newDataObject
        }
    }

    // MB
    class MB {
        constructor() {
            this.spot_markets_url = "https://api.mercadobitcoin.net/api/v4/symbols";
            this.spot_tickers_url = "https://api.mercadobitcoin.net/api/v4/tickers?symbols=";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            let symbolArray = response["symbol"];
            let base_currency = response["base-currency"];
            let currency = response["currency"];
            let minmovement = response["minmovement"];
            let pricescale = response["pricescale"];
            if (!Array.isArray(symbolArray)) {
                return
            }
            for (let i = 0; i < symbolArray.length; i++) {
                let PricePrecision = convertToNumber(String(pricescale[i]).length);
                let BaseAsset = String(base_currency[i]).toLowerCase();
                let QuoteAsset = String(currency[i]).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(symbolArray[i]),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision)),
                    AmountSize: null,
                    PricePrecision: PricePrecision,
                    AmountPrecision: null,
                    MinQty: convertToNumber(minmovement[i]),
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: symbolArray[i]
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let Symbol = String(item['pair']).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['pair']),
                    High: convertToNumber(item["high"]),
                    Low: convertToNumber(item["low"]),
                    Sell: convertToNumber(item["sell"]),
                    Buy: convertToNumber(item["buy"]),
                    Last: convertToNumber(item["last"]),
                    Open: convertToNumber(item["open"]),
                    Volume: convertToNumber(item["vol"]),
                    QuoteVolume: null,
                    Time: convertToNumber(item["date"]),
                    Info: item
                };
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let markets_response = jsonFetch(this.spot_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            let symbolArray = markets_response["symbol"];
            if (!Array.isArray(symbolArray)) {
                return newDataObject
            }
            let chunkLength = Math.ceil(symbolArray.length / 5);
            for (let i = 0; i < symbolArray.length; i += chunkLength) {
                let chunk = symbolArray.slice(i, i + chunkLength);
                let response = jsonFetch(this.spot_tickers_url + chunk.join(','));
                this.parseTickersData(response, newDataObject);
            }
            return newDataObject
        }
    }

    // Backpack
    class Backpack {
        constructor() {
            this.spot_markets_url = "https://api.backpack.exchange/api/v1/markets";
            this.spot_tickers_url = "https://api.backpack.exchange/api/v1/tickers";
            this.spot_klines_url = "https://api.backpack.exchange/api/v1/klines";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let BaseAsset = String(item['baseSymbol']).toLowerCase();
                let QuoteAsset = String(item['quoteSymbol']).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item['filters']["price"]["tickSize"]),
                    AmountSize: convertToNumber(item['filters']["quantity"]["stepSize"]),
                    PricePrecision: countDecimalPlaces(item['filters']["price"]["tickSize"]),
                    AmountPrecision: countDecimalPlaces(item['filters']["price"]["stepSize"]),
                    MinQty: convertToNumber(item['filters']["quantity"]["minQuantity"]),
                    MaxQty: convertToNumber(item['filters']["quantity"]["maxQuantity"]),
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let Symbol = String(item['symbol']).replace(/-/g, '_').toLowerCase();
                let Last = convertToNumber(item["lastPrice"]);
                let change = convertToNumber(item["priceChange"]);
                let Open = convertToNumber(Last - change).toFixed(countDecimalPlaces(Last));
                let High = convertToNumber(item["high"]);
                let Low = convertToNumber(item["low"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    High: High,
                    Low: Low,
                    Sell: null,
                    Buy: null,
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["volume"]),
                    QuoteVolume: convertToNumber(item["quoteVolume"]),
                    Time: null,
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = Math.floor(begin / 1000);
            }

            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1000) {
                    limit = 1000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = '1m';
                endBegin = begin + (limit - 1) * 60;
            }
            else if (interval === '15m') {
                _interval = '15m';
                endBegin = begin + (limit - 1) * 900;
            }
            else {
                _interval = '1d';
                endBegin = begin + (limit - 1) * 86400;
            }
            let url = null;
            if (begin === null) {
                return
            }
            else {
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?symbol=${alias}&interval=${_interval}&startTime=${begin}&endTime=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    let timestamp = new Date(item['start'].replace(' ', 'T')).getTime();
                    klineArray.push([_symbol, timestamp, convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['volume'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 200, _symbol, alias, interval = '1d', begin = 1704038400000, limit = 100) {
            if (interval === '1d') {
                limit = 50;
            }
            // BTC_USDC
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // Bitspay
    class Bitspay {
        constructor() {
            this.spot_markets_url = "https://api.bitspay.global/markets/";
            this.spot_tickers_url = "https://api.bitspay.global/getMarketDetails/";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["combinations"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = String(item['base']).toLowerCase();
                let QuoteAsset = String(item['quote']).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['id']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: null,
                    AmountSize: null,
                    PricePrecision: null,
                    AmountPrecision: null,
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["marketdetails"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Symbol = String(item['pair']).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['pair']),
                    High: convertToNumber(item["highsale"]),
                    Low: convertToNumber(item["lowsale"]),
                    Sell: convertToNumber(item["ask"]),
                    Buy: convertToNumber(item["bid"]),
                    Last: convertToNumber(item["last"]),
                    Open: null,
                    Volume: convertToNumber(item["baseVolume"]),
                    QuoteVolume: convertToNumber(item["quoteVolume"]),
                    Time: null,
                    Info: item
                };
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }
    }

    // BTCMarkets
    class BTCMarkets {
        constructor() {
            this.spot_markets_url = "https://api.btcmarkets.net/v3/markets";
            this.spot_tickers_url = "https://api.btcmarkets.net/v3/markets";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let TickSize = null;
                let AmountSize = null;
                let PricePrecision = convertToNumber(item['priceDecimals']);
                if (PricePrecision < 0) {
                    TickSize = convertToNumber(Math.pow(10, Math.abs(PricePrecision)));
                }
                else {
                    TickSize = convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision));
                }
                let AmountPrecision = convertToNumber(item['amountDecimals']);
                if (AmountPrecision < 0) {
                    AmountSize = convertToNumber(Math.pow(10, Math.abs(AmountPrecision)));
                }
                else {
                    AmountSize = convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision));
                }
                let BaseAsset = String(item['baseAssetName']).toLowerCase();
                let QuoteAsset = String(item['quoteAssetName']).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['marketId']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: TickSize,
                    AmountSize: AmountSize,
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: convertToNumber(item['minOrderAmount']),
                    MaxQty: convertToNumber(item['maxOrderAmount']),
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, _symbol, newDataObject) {
            if (response === null) {
                return
            }
            if (Object.prototype.toString.call(response) !== '[object Object]') {
                return
            }
            try {
                let Symbol = String(response['marketId']).replace(/-/g, '_').toLowerCase();
                let Last = convertToNumber(response["lastPrice"]);
                let change = convertToNumber(response["pricePct24h"]);
                let Open = convertToNumber(Last * (1 - change * 0.01)).toFixed(countDecimalPlaces(Last));
                let High = convertToNumber(response["high24h"]);
                let Low = convertToNumber(response["low24h"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(response['marketId']),
                    High: High,
                    Low: Low,
                    Sell: convertToNumber(response["bestAsk"]),
                    Buy: convertToNumber(response["bestBid"]),
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(response["volume24h"]),
                    QuoteVolume: convertToNumber(response["volumeQte24h"]),
                    Time: convertToNumber(Date.parse(response["timestamp"])),
                    Info: response
                };
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name}  Method: parseTickersData  Symbol: ${_symbol}`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let markets_response = jsonFetch(this.spot_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            if (!Array.isArray(markets_response)) {
                return newDataObject
            }
            for (let i = 0; i < markets_response.length; i++) {
                let item = markets_response[i];
                let response = jsonFetch(this.spot_tickers_url + "/" + item['marketId'] + "/ticker");
                this.parseTickersData(response, item['marketId'], newDataObject);
            }
            Sleep(100);
            return newDataObject
        }
    }

    // KoinBx
    class KoinBx {
        constructor() {
            this.spot_markets_url = "https://api.koinbx.com/markets";
            this.spot_tickers_url = "https://api.koinbx.com/markets";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["markets"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Symbol = String(item['trading_pairs']).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['trading_pairs']),
                    Contract: null,
                    BaseAsset: Symbol.split('_')[0],
                    QuoteAsset: Symbol.split('_')[1],
                    TickSize: null,
                    AmountSize: null,
                    PricePrecision: null,
                    AmountPrecision: null,
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["markets"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Symbol = String(item['trading_pairs']).replace(/-/g, '_').toLowerCase();
                let Last = convertToNumber(item["last_price"]);
                let change = convertToNumber(item["price_change_percent_24h"]);
                let Open = convertToNumber(Last * (1 - change * 0.01)).toFixed(countDecimalPlaces(Last));
                let High = convertToNumber(item["highest_price_24h"]);
                let Low = convertToNumber(item["lowest_price_24h"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['trading_pairs']),
                    High: High,
                    Low: Low,
                    Sell: convertToNumber(item["lowest_ask"]),
                    Buy: convertToNumber(item["highest_bid"]),
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["quote_volume"]),
                    QuoteVolume: convertToNumber(item["volume_24h"]),
                    Time: null,
                    Info: item
                };
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }
    }

    // ICRYPEX
    class ICRYPEX {
        constructor() {
            this.spot_markets_url = "https://api.icrypex.com/v1/exchange/info";
            this.spot_tickers_url = "https://api.icrypex.com/v1/tickers";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["pairs"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let TickSize = null;
                let AmountSize = null;
                let PricePrecision = convertToNumber(item['pricePrecision']);
                if (PricePrecision < 0) {
                    TickSize = convertToNumber(Math.pow(10, Math.abs(PricePrecision)));
                }
                else {
                    TickSize = convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision));
                }
                let AmountPrecision = convertToNumber(item['quantityPrecision']);
                if (AmountPrecision < 0) {
                    AmountSize = convertToNumber(Math.pow(10, Math.abs(AmountPrecision)));
                }
                else {
                    AmountSize = convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision));
                }
                let BaseAsset = String(item['base']).toLowerCase();
                let QuoteAsset = String(item['quote']).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: TickSize,
                    AmountSize: AmountSize,
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: convertToNumber(item['minExchangeValue']),
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let Last = convertToNumber(item["last"]);
                let change = convertToNumber(item["change"]);
                let Open = convertToNumber(Last * (1 - change * 0.01)).toFixed(countDecimalPlaces(Last));
                let High = convertToNumber(item["high"]);
                let Low = convertToNumber(item["low"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                let Symbol = String(item['symbol']).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    High: High,
                    Low: Low,
                    Sell: convertToNumber(item["ask"]),
                    Buy: convertToNumber(item["bid"]),
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["volume"]),
                    QuoteVolume: null,
                    Time: null,
                    Info: item
                };
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }
    }

    // IndoEx
    class IndoEx {
        constructor() {
            this.spot_markets_url = "https://api.indoex.io/markets";
            this.spot_tickers_url = "https://api.indoex.io/getMarketDetails";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["combinations"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let BaseAsset = String(item['base']).toLowerCase();
                let QuoteAsset = String(item['quote']).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset;
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['id']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: null,
                    AmountSize: null,
                    PricePrecision: null,
                    AmountPrecision: null,
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["marketdetails"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Symbol = String(item['pair']).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['pair']),
                    High: convertToNumber(item["highsale"]),
                    Low: convertToNumber(item["lowsale"]),
                    Sell: convertToNumber(item["ask"]),
                    Buy: convertToNumber(item["bid"]),
                    Last: convertToNumber(item["last"]),
                    Open: null,
                    Volume: null,
                    QuoteVolume: convertToNumber(item["baseVolume"]),
                    Time: null,
                    Info: item
                };
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }
    }

    // BTSE
    class BTSE {
        constructor() {
            this.spot_markets_url = "https://api.btse.com/spot/api/v3.2/market_summary";
            this.swap_markets_url = "https://api.btse.com/futures/api/v2.1/market_summary";
            this.spot_tickers_url = "https://api.btse.com/spot/api/v3.2/market_summary";
            this.swap_tickers_url = "https://api.btse.com/futures/api/v2.1/market_summary";
        }

        parseMarketsData(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let BaseAsset = String(item['base']).toLowerCase();
                let QuoteAsset = String(item['quote']).toLowerCase();
                let Symbol = null;
                let Contract = null;
                if (symbolType === 'spot') {
                    Symbol = BaseAsset + '_' + QuoteAsset;
                }
                else {
                    Contract = 'swap';
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: Contract,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item['minPriceIncrement']),
                    AmountSize: convertToNumber(item['minSizeIncrement']),
                    PricePrecision: countDecimalPlaces(item['minPriceIncrement']),
                    AmountPrecision: countDecimalPlaces(item['minSizeIncrement']),
                    MinQty: convertToNumber(item['minOrderSize']),
                    MaxQty: convertToNumber(item['maxOrderSize']),
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let BaseAsset = String(item['base']).toLowerCase();
                let QuoteAsset = String(item['quote']).toLowerCase();
                let Symbol = null;
                if (symbolType === 'spot') {
                    Symbol = BaseAsset + '_' + QuoteAsset;
                }
                else {
                    Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                }
                let Last = convertToNumber(item["last"]);
                let change = convertToNumber(item["percentageChange"]);
                let Open = convertToNumber(Last * (1 - change * 0.01)).toFixed(countDecimalPlaces(Last));
                let High = convertToNumber(item["high24Hr"]);
                let Low = convertToNumber(item["low24Hr"]);
                if (Open > High) {
                    Open = High;
                }
                if (Open < Low) {
                    Open = Low;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    High: High,
                    Low: Low,
                    Sell: convertToNumber(item["lowestAsk"]),
                    Buy: convertToNumber(item["highestBid"]),
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["volume"]),
                    QuoteVolume: null,
                    Time: null,
                    Info: item
                };
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, 'spot', newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData(response, 'swap', newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, 'spot', newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData(response, 'swap', newDataObject);
            return newDataObject
        }
    }

    // HitBTC
    class HitBTC {
        constructor() {
            this.spot_markets_url = "https://api.hitbtc.com/api/3/public/symbol";
            this.swap_markets_url = "https://api.hitbtc.com/api/3/public/symbol";
            this.spot_tickers_url = "https://api.hitbtc.com/api/3/public/ticker";
            this.swap_tickers_url = "https://api.hitbtc.com/api/3/public/ticker";
            this.spot_klines_url = "https://api.hitbtc.com/api/3/public/candles";
            this.swap_klines_url = "https://api.hitbtc.com/api/3/public/candles";
            this.swap_klines_url = "https://api.hitbtc.com/api/3/public/candles";
            this.index_url = "https://api.hitbtc.com/api/3/public/futures/candles/index_price";
        }

        parseMarketsData(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            if (Object.prototype.toString.call(response) !== '[object Object]') {
                return
            }
            for (let _symbol in response) {
                let item = response[_symbol];
                if (item["type"].toLowerCase() !== symbolType) {
                    continue;
                }
                if (item["status"] !== 'working') {
                    continue;
                }
                let Symbol = null;
                let Contract = null;
                let BaseAsset = null;
                let QuoteAsset = null
                if (symbolType === 'spot') {
                    BaseAsset = String(item['base_currency']).toLowerCase();
                    QuoteAsset = String(item['quote_currency']).toLowerCase();
                    Symbol = BaseAsset + '_' + QuoteAsset;
                }
                else {
                    BaseAsset = String(item['underlying']).toLowerCase();
                    QuoteAsset = String(item['quote_currency']).toLowerCase();
                    Contract = 'swap';
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(_symbol),
                    Contract: Contract,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item['tick_size']),
                    AmountSize: convertToNumber(item['quantity_increment']),
                    PricePrecision: countDecimalPlaces(item['tick_size']),
                    AmountPrecision: countDecimalPlaces(item['quantity_increment']),
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            if (Object.prototype.toString.call(response) !== '[object Object]') {
                return
            }
            for (let _symbol in response) {
                if (symbolType === 'spot') {
                    if (_symbol.slice(-4) === "PERP") {
                        continue;
                    }
                }
                else {
                    if (_symbol.slice(-4) !== "PERP") {
                        continue;
                    }
                }
                let Symbol = String(_symbol).replace(/-/g, '_').toLowerCase();
                let item = response[_symbol];
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(_symbol),
                    High: convertToNumber(item["high"]),
                    Low: convertToNumber(item["low"]),
                    Sell: convertToNumber(item["ask"]),
                    Buy: convertToNumber(item["bid"]),
                    Last: convertToNumber(item["last"]),
                    Open: convertToNumber(item["open"]),
                    Volume: convertToNumber(item["volume"]),
                    QuoteVolume: convertToNumber(item["volume_quote"]),
                    Time: convertToNumber(Date.parse(item["timestamp"])),
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1000) {
                    limit = 1000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = 'M1';
                endBegin = begin + (limit - 1) * 60000;
            }
            else if (interval === '15m') {
                _interval = 'M15';
                endBegin = begin + (limit - 1) * 900000;
            }
            else {
                _interval = 'D1';
                endBegin = begin + (limit - 1) * 86400000;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}/${alias}?period=${_interval}&limit=${limit}`;
            }
            else {
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}/${alias}?period=${_interval}&limit=${limit}&from=${begin}&till=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                response.reverse();
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    let timestamp = new Date(item['timestamp']).getTime();
                    klineArray.push([_symbol, convertToNumber(timestamp), convertToNumber(item['open']), convertToNumber(item['max']),
                        convertToNumber(item['min']), convertToNumber(item['close']), convertToNumber(item['volume'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesIndexData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1000) {
                    limit = 1000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = 'M1';
                endBegin = begin + (limit - 1) * 60000;
            }
            else if (interval === '15m') {
                _interval = 'M15';
                endBegin = begin + (limit - 1) * 900000;
            }
            else {
                _interval = 'D1';
                endBegin = begin + (limit - 1) * 86400000;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}/${alias}?period=${_interval}&limit=${limit}`;
            }
            else {
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}/${alias}?period=${_interval}&limit=${limit}&from=${begin}&till=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                response.reverse();
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    let timestamp = new Date(item['timestamp']).getTime();
                    klineArray.push([_symbol, convertToNumber(timestamp), convertToNumber(item['open']), convertToNumber(item['max']),
                        convertToNumber(item['min']), convertToNumber(item['close']), 0]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, "spot", newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData(response, "futures", newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, "spot", newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData(response, "futures", newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 50, _symbol, alias, interval = '1d', begin = 1385827200000, limit = 1000) {
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 50, _symbol, alias, interval = '1d', begin = 1622476800000, limit = 1000) {
            while (true) {
                let klineArray = this.parseKlinesData(this.swap_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(价格指数)
        fetchKlinesIndex(sleep = 50, _symbol, alias, interval = '1d', begin = 1622476800000, limit = 1000) {
            while (true) {
                let klineArray = this.parseKlinesIndexData(this.index_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // Bibox
    class Bibox {
        constructor() {
            this.spot_markets_url = "https://api.bibox.com/v3/mdata/pairList";
            this.u_swap_markets_url = "https://api.bibox.com/api/v4/cbu/marketdata/pairs";
            this.b_swap_markets_url = "https://api.bibox.com/v3.1/cquery/bcValue";
            this.spot_tickers_url = "https://api.bibox.com/v3/mdata/marketAll";
            this.swap_tickers_url = "https://api.bibox.com/api/v4/cbu/marketdata/ticker";
            this.spot_klines_url = "https://api.bibox.com/v3/mdata/kline";
            this.u_swap_klines_url = "https://api.bibox.com/api/v4/cbu/marketdata/candles";
            this.b_swap_klines_url = "https://api.bibox.com/v2/mdata/kline"
            this.index_url = "https://api.bibox.com/api/v4/cbu/marketdata/indices";
        }

        parseMarketsData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["result"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Symbol = String(item['pair']).replace(/-/g, '_').toLowerCase();
                let BaseAsset = Symbol.split('_')[0];
                let QuoteAsset = Symbol.split('_')[1];
                let TickSize = null;
                let AmountSize = null;
                let PricePrecision = convertToNumber(item["decimal"]);
                if (PricePrecision < 0) {
                    TickSize = convertToNumber(Math.pow(10, Math.abs(PricePrecision)));
                }
                else {
                    TickSize = convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision));
                }
                let AmountPrecision = convertToNumber(item["amount_scale"]);
                if (AmountPrecision < 0) {
                    AmountSize = convertToNumber(Math.pow(10, Math.abs(AmountPrecision)));
                }
                else {
                    AmountSize = convertToNumber(Math.pow(0.1, AmountPrecision).toFixed(AmountPrecision));
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['pair']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: TickSize,
                    AmountSize: AmountSize,
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseMarketsData2(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let BaseAsset = String(item['base']).toLowerCase();
                let QuoteAsset = String(item['quote']).toLowerCase();
                let CtVal = null;
                let CtValCcy = null;
                let TickSize = null;
                if (QuoteAsset === 'usd') {
                    CtVal = 1;
                    CtValCcy = QuoteAsset;
                }
                else if (QuoteAsset === 'usdt') {
                    CtVal = 1;
                    CtValCcy = BaseAsset;
                }
                let PricePrecision = convertToNumber(item["price_scale"]);
                if (PricePrecision < 0) {
                    TickSize = convertToNumber(Math.pow(10, Math.abs(PricePrecision)));
                }
                else {
                    TickSize = convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision));
                }
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: 'swap',
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: TickSize,
                    AmountSize: convertToNumber(item["quantity_increment"]),
                    PricePrecision: PricePrecision,
                    AmountPrecision: countDecimalPlaces(item["quantity_increment"]),
                    MinQty: convertToNumber(item["quantity_min"]),
                    MaxQty: convertToNumber(item["quantity_max"]),
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: CtVal,
                    CtValCcy: CtValCcy,
                    Info: item
                };
            }
        }

        parseMarketsData3(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["result"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let pair = String(item['pair']).replace(/-/g, '_').toLowerCase();
                let BaseAsset = String(item['coin_symbol']).toLowerCase();
                let QuoteAsset = pair.split('_')[1];
                let CtVal = null;
                let CtValCcy = null;
                let TickSize = null;
                if (QuoteAsset === 'usd') {
                    CtVal = 1;
                    CtValCcy = QuoteAsset;
                }
                else if (QuoteAsset === 'usdt') {
                    CtVal = 1;
                    CtValCcy = BaseAsset;
                }
                let PricePrecision = convertToNumber(item["price_precision"]);
                if (PricePrecision < 0) {
                    TickSize = convertToNumber(Math.pow(10, Math.abs(PricePrecision)));
                }
                else {
                    TickSize = convertToNumber(Math.pow(0.1, PricePrecision).toFixed(PricePrecision));
                }
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['pair']),
                    Contract: 'swap',
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: TickSize,
                    AmountSize: null,
                    PricePrecision: PricePrecision,
                    AmountPrecision: null,
                    MinQty: null,
                    MaxQty: convertToNumber(item["pending_max"]),
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: CtVal,
                    CtValCcy: CtValCcy,
                    Info: item
                };
            }
        }

        parseTickersData1(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["result"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let coin_symbol = String(item['coin_symbol']);
                let currency_symbol = String(item['currency_symbol']);
                let Symbol = coin_symbol.toLowerCase() + '_' + currency_symbol.toLowerCase();
                let Last = convertToNumber(item["last"]);
                let change = convertToNumber(item["change"]);
                let Open = convertToNumber((Last - change).toFixed(countDecimalPlaces(Last)));
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: coin_symbol + '_' + currency_symbol,
                    High: convertToNumber(item["high"]),
                    Low: convertToNumber(item["low"]),
                    Sell: null,
                    Buy: null,
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(item["vol24H"]),
                    QuoteVolume: convertToNumber(item["amount"]),
                    Time: null,
                    Info: item
                };
            }
        }

        parseTickersData2(response, symbolObject, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let _symbol = String(item['s']);
                let Symbol = symbolObject[_symbol];
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: _symbol,
                    High: convertToNumber(item["h"]),
                    Low: convertToNumber(item["l"]),
                    Sell: convertToNumber(item["ap"]),
                    Buy: convertToNumber(item["bp"]),
                    Last: convertToNumber(item["p"]),
                    Open: convertToNumber(item["o"]),
                    Volume: convertToNumber(item["q"]),
                    QuoteVolume: convertToNumber(item["v"]),
                    Time: convertToNumber(item["t"]),
                    Info: item
                };
            }
        }

        parseKlinesData1(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1000) {
                    limit = 1000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = '1min';
            }
            else if (interval === '15m') {
                _interval = '15min';
            }
            else {
                _interval = 'day';
            }
            let url = `${base_url}?pair=${alias}&period=${_interval}&size=${limit}`;

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['result'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['time']), convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['vol'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesData2(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 300) {
                    limit = 300;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = '1m';
            }
            else if (interval === '15m') {
                _interval = '15m';
            }
            else {
                _interval = '1d';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&time_frame=${_interval}&limit=${limit}`;
            }
            else {
                if (interval === '1m') {
                    begin -= 60000;
                }
                else if (interval === '15m') {
                    begin -= 900000;
                }
                else {
                    begin -= 86400000;
                }
                url = `${base_url}?symbol=${alias}&time_frame=${_interval}&after=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = null;
                if (begin === null) {
                    dataArray = response['e'];
                }
                else {
                    dataArray = response;
                }
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesData3(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1000) {
                    limit = 1000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = '1min';
            }
            else if (interval === '15m') {
                _interval = '15min';
            }
            else {
                _interval = 'day';
            }
            let url = `${base_url}?pair=${alias}&period=${_interval}&size=${limit}`;

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['result'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['time']), convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['vol'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesIndexData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 300) {
                    limit = 300;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            if (interval === '1m') {
                _interval = '1m';
            }
            else if (interval === '15m') {
                _interval = '15m';
            }
            else {
                _interval = '1d';
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&time_frame=${_interval}&limit=${limit}`;
            }
            else {
                if (interval === '1m') {
                    begin -= 60000;
                }
                else if (interval === '15m') {
                    begin -= 900000;
                }
                else {
                    begin -= 86400000;
                }
                url = `${base_url}?symbol=${alias}&time_frame=${_interval}&limit=${limit}&after=${begin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = null;
                if (begin === null) {
                    dataArray = response['e'];
                }
                else {
                    dataArray = response;
                }
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), 0]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData1(response, newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let u_response = jsonFetch(this.u_swap_markets_url);
            this.parseMarketsData2(u_response, newDataObject);
            let b_response = jsonFetch(this.b_swap_markets_url);
            this.parseMarketsData3(b_response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData1(response, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let symbolObject = {};
            let symbolArray = [];
            let markets_response = jsonFetch(this.swap_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            if (!Array.isArray(markets_response)) {
                return newDataObject
            }
            for (let i = 0; i < markets_response.length; i++) {
                let item = markets_response[i];
                let _symbol = String(item['symbol']);
                let BaseAsset = String(item['base']).toLowerCase();
                let QuoteAsset = String(item['quote']).toLowerCase();
                symbolArray.push(_symbol);
                symbolObject[_symbol] = BaseAsset + '_' + QuoteAsset + '.swap';
            }
            let response = jsonFetch(this.swap_tickers_url + '?symbol=' + symbolArray.join(','));
            this.parseTickersData2(response, symbolObject, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 10, _symbol, alias, interval = '1d', begin = null, limit = 1000) {
            let klineArray = this.parseKlinesData1(this.spot_klines_url, _symbol, alias, interval, begin, limit);
            deferSleep(sleep);
            return klineArray
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 10, _symbol, alias, interval = '1d', begin = 1659283200000, limit = 1000) {
            if (alias.includes('_') && alias.split('_')[1] === 'USD') {
                let klineArray = this.parseKlinesData3(this.b_swap_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                return klineArray
            }
            else {
                while (true) {
                    let klineArray = this.parseKlinesData2(this.u_swap_klines_url, _symbol, alias, interval, begin, limit);
                    deferSleep(sleep);
                    let dataFlag = parseData(klineArray, begin, interval);
                    if (typeof dataFlag !== 'number') {
                        return klineArray
                    }
                    else {
                        begin = dataFlag;
                    }
                }
            }
        }

        // K线数据(价格指数)
        fetchKlinesIndex(sleep = 10, _symbol, alias, interval = '1d', begin = 1659283200000, limit = 300) {
            while (true) {
                let klineArray = this.parseKlinesIndexData(this.index_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // Korbit
    class Korbit {
        constructor() {
            this.spot_markets_url = "https://api.korbit.co.kr/v2/currencyPairs";
            this.spot_tickers_url = "https://api.korbit.co.kr/v2/tickers";
            this.spot_klines_url = "https://api.korbit.co.kr/v2/candles";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let status = item["status"];
                if (status !== 'launched') {
                    continue;
                }
                let Symbol = String(item['symbol']).replace(/-/g, '_').toLowerCase();
                let BaseAsset = Symbol.split('_')[0];
                let QuoteAsset = Symbol.split('_')[1];
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: null,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: null,
                    AmountSize: null,
                    PricePrecision: null,
                    AmountPrecision: null,
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: null,
                    CtValCcy: null,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["data"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let Symbol = String(item['symbol']).replace(/-/g, '_').toLowerCase();
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    High: convertToNumber(item["high"]),
                    Low: convertToNumber(item["low"]),
                    Sell: null,
                    Buy: null,
                    Last: convertToNumber(item["close"]),
                    Open: convertToNumber(item["open"]),
                    Volume: convertToNumber(item["volume"]),
                    QuoteVolume: convertToNumber(item["quoteVolume"]),
                    Time: convertToNumber(item["lastTradedAt"]),
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 200) {
                    limit = 200;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = 1;
                endBegin = begin + (limit - 1) * 60000;
            }
            else if (interval === '15m') {
                _interval = 15;
                endBegin = begin + (limit - 1) * 900000;
            }
            else {
                _interval = '1D';
                endBegin = begin + (limit - 1) * 86400000;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&interval=${_interval}&limit=${limit}`;
            }
            else {
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?symbol=${alias}&interval=${_interval}&limit=${limit}&start=${begin}&end=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['data'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['timestamp']), convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['volume'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 20, _symbol, alias, interval = '1d', begin = 1377964800000, limit = 200) {
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // Deribit
    class Deribit {
        constructor() {
            this.spot_markets_url = "https://deribit.com/api/v2/public/get_instruments?currency=any";
            this.swap_markets_url = "https://deribit.com/api/v2/public/get_instruments?currency=any";
            this.future_markets_url = "https://deribit.com/api/v2/public/get_instruments?currency=any";
            this.spot_tickers_url = "https://deribit.com/api/v2/public/ticker?instrument_name=";
            this.swap_tickers_url = "https://deribit.com/api/v2/public/ticker?instrument_name=";
            this.future_tickers_url = "https://deribit.com/api/v2/public/ticker?instrument_name=";
            this.spot_klines_url = "https://deribit.com/api/v2/public/get_tradingview_chart_data";
            this.swap_klines_url = "https://deribit.com/api/v2/public/get_tradingview_chart_data";
            this.future_klines_url = "https://deribit.com/api/v2/public/get_tradingview_chart_data";
            this.funding_url = "https://deribit.com/api/v2/public/get_funding_rate_history";
        }

        parseMarketsData(response, symbolType, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["result"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let is_active = item['is_active'];
                if (is_active !== true) {
                    continue;
                }
                let BaseAsset = String(item['base_currency']).toLowerCase();
                let QuoteAsset = String(item['quote_currency']).toLowerCase();
                let Symbol = null;
                let Contract = null;
                let CtVal = null;
                let CtValCcy = null;
                let kind = item['kind'];
                let settlement_period = item['settlement_period'];
                if (symbolType === 'spot') {
                    if (kind !== 'spot') {
                        continue;
                    }
                    Symbol = BaseAsset + '_' + QuoteAsset;
                }
                else if (symbolType === 'swap') {
                    if (kind !== 'future') {
                        continue;
                    }
                    if (settlement_period !== 'perpetual') {
                        continue;
                    }
                    Contract = 'swap';
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                    CtVal = convertToNumber(item["contract_size"]);
                    if (QuoteAsset === 'usd') {
                        CtValCcy = QuoteAsset;
                    }
                    else if (QuoteAsset === 'usdt' || QuoteAsset === 'usdc') {
                        CtValCcy = BaseAsset;
                    }
                }
                else {
                    if (kind !== 'future') {
                        continue;
                    }
                    if (settlement_period === 'perpetual') {
                        continue;
                    }
                    Contract = settlement_period + '_' + item['instrument_name'].split('-')[1];
                    Symbol = BaseAsset + '_' + QuoteAsset + '.' + Contract;
                    CtVal = convertToNumber(item["contract_size"]);
                    if (QuoteAsset === 'usd') {
                        CtValCcy = QuoteAsset;
                    }
                    else if (QuoteAsset === 'usdt' || QuoteAsset === 'usdc') {
                        CtValCcy = BaseAsset;
                    }
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['instrument_name']),
                    Contract: Contract,
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item["tick_size"]),
                    AmountSize: convertToNumber(item["block_trade_tick_size"]),
                    PricePrecision: countDecimalPlaces(item["tick_size"]),
                    AmountPrecision: countDecimalPlaces(item["block_trade_tick_size"]),
                    MinQty: null,
                    MaxQty: null,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: CtVal,
                    CtValCcy: CtValCcy,
                    Info: item
                };
            }
        }

        parseTickersData(response, _symbol, newDataObject) {
            if (response === null) {
                return
            }
            if (Object.prototype.toString.call(response) !== '[object Object]') {
                return
            }
            try {
                let Last = convertToNumber(response['result']['last_price']);
                let price_change = convertToNumber(response['result']['stats']['price_change']);
                let Open = convertToNumber((Last * (1 - price_change * 0.01)).toFixed(countDecimalPlaces(Last)));
                newDataObject[_symbol] = {
                    Symbol: _symbol,
                    Alias: String(response['result']['instrument_name']),
                    High: convertToNumber(response['result']['stats']['high']),
                    Low: convertToNumber(response['result']['stats']['low']),
                    Sell: convertToNumber(response['result']['best_ask_price']),
                    Buy: convertToNumber(response['result']['best_bid_price']),
                    Last: Last,
                    Open: Open,
                    Volume: convertToNumber(response['result']['stats']['volume']),
                    QuoteVolume: convertToNumber(response['result']['stats']['volume_usd']),
                    Time: convertToNumber(response['result']['timestamp']),
                    Info: response
                };
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name}  Method: parseTickersData  Symbol: ${_symbol}`, String(error));
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 2000) {
                    limit = 2000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = 1;
                endBegin = begin + (limit - 1) * 60000;
            }
            else if (interval === '15m') {
                _interval = 15;
                endBegin = begin + (limit - 1) * 900000;
            }
            else {
                _interval = '1D';
                endBegin = begin + (limit - 1) * 86400000;
            }
            let url = null;
            if (begin === null) {
                return
            }
            else {
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?instrument_name=${alias}&resolution=${_interval}&start_timestamp=${begin}&end_timestamp=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let result = response['result']
                if (Object.prototype.toString.call(result) !== '[object Object]') {
                    return
                }
                let timeArray = result['ticks'];
                let openArray = result['open'];
                let highArray = result['high'];
                let lowArray = result['low'];
                let closeArray = result['close'];
                let volumeArray = result['volume'];
                if (!Array.isArray(timeArray)) {
                    return
                }
                for (let i = 0; i < timeArray.length; i++) {
                    klineArray.push([_symbol, convertToNumber(timeArray[i]), convertToNumber(openArray[i]), convertToNumber(highArray[i]),
                        convertToNumber(lowArray[i]), convertToNumber(closeArray[i]), convertToNumber(volumeArray[i])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesFundingData(base_url, _symbol, alias, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 720) {
                    limit = 720;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let url = null;
            let endBegin = null;
            if (begin === null) {
                return
            }
            else {
                endBegin = begin + (limit - 1) * 3600000;
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?instrument_name=${alias}&start_timestamp=${begin}&end_timestamp=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['result'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item['timestamp']), convertToNumber(item['interest_1h'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SPOT(现货)
        getMarketsSpot() {
            let newDataObject = {};
            let response = jsonFetch(this.spot_markets_url);
            this.parseMarketsData(response, 'spot', newDataObject);
            return newDataObject
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData(response, 'swap', newDataObject);
            return newDataObject
        }

        // Markets FUTURES(交割合约)
        getMarketsFuture() {
            let newDataObject = {};
            let response = jsonFetch(this.future_markets_url);
            this.parseMarketsData(response, 'future', newDataObject);
            return newDataObject
        }

        // Tickers SPOT(现货)
        getTickersSpot() {
            let newDataObject = {};
            let markets_response = jsonFetch(this.spot_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            let dataArray = markets_response["result"];
            if (!Array.isArray(dataArray)) {
                return newDataObject
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let is_active = item['is_active'];
                if (is_active !== true) {
                    continue;
                }
                let kind = item['kind'];
                if (kind !== 'spot') {
                    continue;
                }
                let BaseAsset = String(item['base_currency']).toLowerCase();
                let QuoteAsset = String(item['quote_currency']).toLowerCase();
                let _symbol = BaseAsset + '_' + QuoteAsset;
                let instrument_name = String(item['instrument_name']);
                let response = jsonFetch(this.spot_tickers_url + instrument_name);
                this.parseTickersData(response, _symbol, newDataObject);
                Sleep(50);
            }
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let markets_response = jsonFetch(this.swap_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            let dataArray = markets_response["result"];
            if (!Array.isArray(dataArray)) {
                return newDataObject
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let is_active = item['is_active'];
                if (is_active !== true) {
                    continue;
                }
                let kind = item['kind'];
                let settlement_period = item['settlement_period'];
                if (kind !== 'future') {
                    continue;
                }
                if (settlement_period !== 'perpetual') {
                    continue;
                }
                let BaseAsset = String(item['base_currency']).toLowerCase();
                let QuoteAsset = String(item['quote_currency']).toLowerCase();
                let _symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                let instrument_name = String(item['instrument_name']);
                let response = jsonFetch(this.swap_tickers_url + instrument_name);
                this.parseTickersData(response, _symbol, newDataObject);
                Sleep(50);
            }
            return newDataObject
        }

        // Tickers FUTURES(交割合约)
        getTickersFuture() {
            let newDataObject = {};
            let markets_response = jsonFetch(this.future_markets_url);
            if (markets_response === null) {
                return newDataObject
            }
            let dataArray = markets_response["result"];
            if (!Array.isArray(dataArray)) {
                return newDataObject
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let is_active = item['is_active'];
                if (is_active !== true) {
                    continue;
                }
                let kind = item['kind'];
                let settlement_period = item['settlement_period'];
                if (kind !== 'future') {
                    continue;
                }
                if (settlement_period === 'perpetual') {
                    continue;
                }
                let instrument_name = String(item['instrument_name']);
                let BaseAsset = String(item['base_currency']).toLowerCase();
                let QuoteAsset = String(item['quote_currency']).toLowerCase();
                let _symbol = BaseAsset + '_' + QuoteAsset + '.' + settlement_period + '_' + instrument_name.split('-')[1];
                let response = jsonFetch(this.future_tickers_url + instrument_name);
                this.parseTickersData(response, _symbol, newDataObject);
                Sleep(50);
            }
            return newDataObject
        }

        // K线数据(现货)
        fetchKlinesSpot(sleep = 50, _symbol, alias, interval = '1d', begin = 1675180800000, limit = 2000) {
            while (true) {
                let klineArray = this.parseKlinesData(this.spot_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 50, _symbol, alias, interval = '1d', begin = 1533052800000, limit = 2000) {
            while (true) {
                let klineArray = this.parseKlinesData(this.swap_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(交割合约)
        fetchKlinesFuture(sleep = 50, _symbol, alias, interval = '1d', begin = 1533052800000, limit = 2000) {
            while (true) {
                let klineArray = this.parseKlinesData(this.future_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(资金费率)
        fetchKlinesFunding(sleep = 50, _symbol, alias, begin = 1533052800000, limit = 720) {
            while (true) {
                let klineArray = this.parseKlinesFundingData(this.funding_url, _symbol, alias, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // Aevo
    class Aevo {
        constructor() {
            this.swap_markets_url = "https://api.aevo.xyz/markets";
            this.funding_url = "https://api.aevo.xyz/funding-history";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            if (!Array.isArray(response)) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let is_active = item['is_active'];
                let instrument_type = item['instrument_type'];
                if (is_active !== true || instrument_type !== 'PERPETUAL') {
                    continue;
                }
                let BaseAsset = String(item['underlying_asset']).toLowerCase();
                let QuoteAsset = String(item['quote_asset']).toLowerCase();
                let CtVal = null;
                let CtValCcy = null;
                if (QuoteAsset === 'usdc') {
                    CtVal = 1;
                    CtValCcy = BaseAsset;
                }
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['instrument_name']),
                    Contract: 'swap',
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item["price_step"]),
                    AmountSize: convertToNumber(item["amount_step"]),
                    PricePrecision: countDecimalPlaces(item["price_step"]),
                    AmountPrecision: countDecimalPlaces(item["amount_step"]),
                    MinQty: convertToNumber(item["min_order_value"]),
                    MaxQty: convertToNumber(item["max_order_value"]),
                    MinNotional: null,
                    MaxNotional: convertToNumber(item["max_notional_value"]),
                    CtVal: CtVal,
                    CtValCcy: CtValCcy,
                    Info: item
                };
            }
        }

        parseKlinesFundingData(base_url, _symbol, alias, begin, limit) {
            if (begin !== null && String(begin).length === 13) {
                begin = begin * 1000000;
            }
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 500) {
                    limit = 500;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let url = null;
            let endBegin = null;
            if (begin === null) {
                url = `${base_url}?instrument_name=${alias}&limit=${limit}`;
            }
            else {
                endBegin = begin + (limit - 1) * 3600000000000;
                let date_now = Date.now() * 1000000;
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?instrument_name=${alias}&limit=${limit}&start_time=${begin}&end_time=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['funding_history'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                dataArray.reverse();
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    klineArray.push([_symbol, convertToNumber(item[1]) / 1000000, convertToNumber(item[2])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // K线数据(资金费率)
        fetchKlinesFunding(sleep = 50, _symbol, alias, begin = 1685548800000, limit = 500) {
            while (true) {
                let klineArray = this.parseKlinesFundingData(this.funding_url, _symbol, alias, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

    }

    // dYdX
    class DYdX {
        constructor() {
            this.swap_markets_url = "https://api.dydx.exchange/v3/markets";
            this.swap_tickers_url = "https://api.dydx.exchange/v3/stats";
            this.klines_url = 'https://api.dydx.exchange/v3/candles'
            this.funding_url = "https://api.dydx.exchange/v3/historical-funding";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            let marketsObject = response['markets'];
            if (Object.prototype.toString.call(marketsObject) !== '[object Object]') {
                return
            }
            for (let _symbol in marketsObject) {
                let item = marketsObject[_symbol];
                let status = item['status'];
                let type = item['type'];
                if (status !== 'ONLINE' || type !== 'PERPETUAL') {
                    continue;
                }
                let BaseAsset = String(item['baseAsset']).toLowerCase();
                let QuoteAsset = String(item['quoteAsset']).toLowerCase();
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                let CtVal = null;
                let CtValCcy = null;
                if (QuoteAsset === 'usd') {
                    CtVal = 1;
                    CtValCcy = BaseAsset;
                }
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(_symbol),
                    Contract: 'swap',
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: convertToNumber(item["tickSize"]),
                    AmountSize: convertToNumber(item["stepSize"]),
                    PricePrecision: countDecimalPlaces(item["tickSize"]),
                    AmountPrecision: countDecimalPlaces(item["stepSize"]),
                    MinQty: convertToNumber(item["minOrderSize"]),
                    MaxQty: convertToNumber(item["maxPositionSize"]),
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: CtVal,
                    CtValCcy: CtValCcy,
                    Info: item
                };
            }
        }

        parseTickersData(response, newDataObject) {
            if (response === null) {
                return
            }
            let marketsObject = response['markets'];
            if (Object.prototype.toString.call(marketsObject) !== '[object Object]') {
                return
            }
            for (let _symbol in marketsObject) {
                let item = marketsObject[_symbol];
                let type = item['type'];
                if (type !== 'PERPETUAL') {
                    continue;
                }
                let Symbol = String(_symbol).replace(/-/g, '_').toLowerCase() + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(_symbol),
                    High: convertToNumber(item['high']),
                    Low: convertToNumber(item['low']),
                    Sell: null,
                    Buy: null,
                    Last: convertToNumber(item['close']),
                    Open: convertToNumber(item['open']),
                    Volume: convertToNumber(item['baseVolume']),
                    QuoteVolume: convertToNumber(item['quoteVolume']),
                    Time: null,
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 100) {
                    limit = 100;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = '1MIN';
                endBegin = begin + (limit - 1) * 60000;
            }
            else if (interval === '15m') {
                _interval = '15MINS';
                endBegin = begin + (limit - 1) * 900000;
            }
            else {
                _interval = '1DAY';
                endBegin = begin + (limit - 1) * 86400000;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}/${alias}?resolution=${_interval}&limit=${limit}`;
            }
            else {
                if (interval === '1m') {
                    begin = begin - 60000;
                }
                else if (interval === '15m') {
                    begin = begin - 900000;
                }
                else {
                    begin = begin - 86400000;
                }
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                let beginDate = new Date(begin);
                let endBeginDate = new Date(endBegin);
                url = `${base_url}/${alias}?resolution=${_interval}&limit=${limit}&fromISO=${beginDate.toISOString()}&toISO=${endBeginDate.toISOString()}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['candles']
                if (!Array.isArray(dataArray)) {
                    return
                }
                dataArray.reverse();
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    let timestamp = new Date(item['startedAt']).getTime();
                    klineArray.push([_symbol, timestamp, convertToNumber(item['open']), convertToNumber(item['high']),
                        convertToNumber(item['low']), convertToNumber(item['close']), convertToNumber(item['baseTokenVolume'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesFundingData(base_url, _symbol, alias, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 100) {
                    limit = 100;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let url = null;
            let endBegin = null;
            if (begin === null) {
                url = `${base_url}/${alias}`;
            }
            else {
                endBegin = begin + (limit - 1) * 3600000;
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                let endBeginDate = new Date(endBegin);
                url = `${base_url}/${alias}?effectiveBeforeOrAt=${endBeginDate.toISOString()}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                let dataArray = response['historicalFunding'];
                if (!Array.isArray(dataArray)) {
                    return
                }
                dataArray.reverse();
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    let timestamp = new Date(item['effectiveAt']).getTime();
                    klineArray.push([_symbol, convertToNumber(timestamp), convertToNumber(item['rate'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData(response, newDataObject);
            return newDataObject
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 100, _symbol, alias, interval = '1d', begin = 1612108800000, limit = 100) {
            while (true) {
                let klineArray = this.parseKlinesData(this.klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(资金费率)
        fetchKlinesFunding(sleep = 100, _symbol, alias, begin = 1612108800000, limit = 100) {
            while (true) {
                let klineArray = this.parseKlinesFundingData(this.funding_url, _symbol, alias, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }

    // ApolloX
    class ApolloX {
        constructor() {
            this.swap_markets_url = "https://fapi.apollox.finance/fapi/v1/exchangeInfo";
            this.swap_tickers_url = "https://fapi.apollox.finance/fapi/v1/ticker/24hr";
            this.swap_klines_url = "https://fapi.apollox.finance/fapi/v1/klines";
            this.index_url = "https://fapi.apollox.finance/fapi/v1/indexPriceKlines";
            this.funding_url = "https://fapi.apollox.finance/fapi/v1/fundingRate";
        }

        parseMarketsData(response, newDataObject) {
            if (response === null) {
                return
            }
            let dataArray = response["symbols"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let status = item["status"];
                if (status !== 'TRADING') {
                    continue;
                }
                let contractType = item["contractType"];
                if (contractType !== 'PERPETUAL') {
                    continue;
                }
                let TickSize = null;
                let AmountSize = null;
                let PricePrecision = null;
                let AmountPrecision = null;
                let MinQty = null;
                let MaxQty = null;
                let filters = item['filters'];
                for (let j = 0; j < filters.length; j++) {
                    let temp_item = filters[j];
                    let filter_type = temp_item['filterType'];
                    if (filter_type == "PRICE_FILTER") {
                        TickSize = convertToNumber(temp_item['tickSize']);
                        PricePrecision = countDecimalPlaces(temp_item['tickSize']);
                    }
                    else if (filter_type == "LOT_SIZE") {
                        AmountSize = convertToNumber(temp_item['stepSize']);
                        AmountPrecision = countDecimalPlaces(temp_item['stepSize']);
                        MinQty = convertToNumber(temp_item['minQty']);
                        MaxQty = convertToNumber(temp_item['maxQty']);
                    }
                }
                let BaseAsset = String(item["baseAsset"]).toLowerCase();
                let QuoteAsset = String(item["quoteAsset"]).toLowerCase();
                let CtVal = null;
                let CtValCcy = null;
                if (QuoteAsset === 'usd') {
                    CtVal = 1;
                    CtValCcy = QuoteAsset;
                }
                else if (QuoteAsset === 'usdt') {
                    CtVal = 1;
                    CtValCcy = BaseAsset;
                }
                let Symbol = BaseAsset + '_' + QuoteAsset + '.swap';
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    Contract: 'swap',
                    BaseAsset: BaseAsset,
                    QuoteAsset: QuoteAsset,
                    TickSize: TickSize,
                    AmountSize: AmountSize,
                    PricePrecision: PricePrecision,
                    AmountPrecision: AmountPrecision,
                    MinQty: MinQty,
                    MaxQty: MaxQty,
                    MinNotional: null,
                    MaxNotional: null,
                    CtVal: CtVal,
                    CtValCcy: CtValCcy,
                    Info: item
                };
            }
        }

        parseTickersData(response, symbolObject, newDataObject) {
            if (response === null) {
                return
            }
            for (let i = 0; i < response.length; i++) {
                let item = response[i];
                let _symbol = String(item["symbol"]);
                if (!(_symbol in symbolObject)) {
                    continue;
                }
                let Symbol = symbolObject[_symbol];
                newDataObject[Symbol] = {
                    Symbol: Symbol,
                    Alias: String(item['symbol']),
                    High: convertToNumber(item["highPrice"]),
                    Low: convertToNumber(item["lowPrice"]),
                    Sell: null,
                    Buy: null,
                    Last: convertToNumber(item["lastPrice"]),
                    Open: convertToNumber(item["openPrice"]),
                    Volume: convertToNumber(item["volume"]),
                    QuoteVolume: convertToNumber(item["quoteVolume"]),
                    Time: convertToNumber(item["openTime"]),
                    Info: item
                };
            }
        }

        parseKlinesData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1500) {
                    limit = 1500;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = '1m';
                endBegin = begin + (limit - 1) * 60000;
            }
            else if (interval === '15m') {
                _interval = '15m';
                endBegin = begin + (limit - 1) * 900000;
            }
            else {
                _interval = '1d';
                endBegin = begin + (limit - 1) * 86400000;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&interval=${_interval}&limit=${limit}`;
            }
            else {
                url = `${base_url}?symbol=${alias}&interval=${_interval}&limit=${limit}&startTime=${begin}&endTime=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), convertToNumber(item[5])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesIndexData(base_url, _symbol, alias, interval, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1500) {
                    limit = 1500;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let _interval = null;
            let endBegin = null;
            if (interval === '1m') {
                _interval = '1m';
                endBegin = begin + (limit - 1) * 60000;
            }
            else if (interval === '15m') {
                _interval = '15m';
                endBegin = begin + (limit - 1) * 900000;
            }
            else {
                _interval = '1d';
                endBegin = begin + (limit - 1) * 86400000;
            }
            let url = null;
            if (begin === null) {
                url = `${base_url}?pair=${alias}&interval=${_interval}&limit=${limit}`;
            }
            else {
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?pair=${alias}&interval=${_interval}&limit=${limit}&startTime=${begin}&endTime=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(item[0]), convertToNumber(item[1]), convertToNumber(item[2]),
                        convertToNumber(item[3]), convertToNumber(item[4]), 0]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        parseKlinesFundingData(base_url, _symbol, alias, begin, limit) {
            if (!Number.isInteger(limit)) {
                return
            }
            else {
                if (limit > 1000) {
                    limit = 1000;
                }
                else if (limit < 1) {
                    limit = 1;
                }
            }
            let url = null;
            let endBegin = null;
            if (begin === null) {
                url = `${base_url}?symbol=${alias}&limit=${limit}`;
            }
            else {
                endBegin = begin + (limit - 1) * 28800000;
                let date_now = Date.now();
                if (endBegin > date_now) {
                    endBegin = date_now;
                }
                url = `${base_url}?symbol=${alias}&limit=${limit}&startTime=${begin}&endTime=${endBegin}`;
            }

            try {
                let klineArray = [];
                let response = jsonFetch(url);
                if (response === null) {
                    return
                }
                if (!Array.isArray(response)) {
                    return
                }
                for (let i = 0; i < response.length; i++) {
                    let item = response[i];
                    klineArray.push([_symbol, convertToNumber(item['fundingTime']), convertToNumber(item['fundingRate'])]);
                }
                return klineArray
            }
            catch (error) {
                Log(`Exchange: ${this.constructor.name} Symbol: ${_symbol} 获取K线数据失败`, String(error));
            }
        }

        // Markets SWAP(永续合约)
        getMarketsSwap() {
            let newDataObject = {};
            let response = jsonFetch(this.swap_markets_url);
            this.parseMarketsData(response, newDataObject);
            return newDataObject
        }

        // Tickers SWAP(永续合约)
        getTickersSwap() {
            let newDataObject = {};
            let symbolObject = {};
            let markets_response = jsonFetch(this.swap_markets_url);
            if (markets_response === null) {
                return
            }
            let dataArray = markets_response["symbols"];
            if (!Array.isArray(dataArray)) {
                return
            }
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let status = item["status"];
                if (status !== 'TRADING') {
                    continue;
                }
                let contractType = item["contractType"];
                if (contractType !== 'PERPETUAL') {
                    continue;
                }
                let BaseAsset = String(item["baseAsset"]).toLowerCase();
                let QuoteAsset = String(item["quoteAsset"]).toLowerCase();
                let _symbol = String(item["symbol"]);
                symbolObject[_symbol] = BaseAsset + '_' + QuoteAsset + '.swap';
            }
            let response = jsonFetch(this.swap_tickers_url);
            this.parseTickersData(response, symbolObject, newDataObject);
            return newDataObject
        }

        // K线数据(永续合约)
        fetchKlinesSwap(sleep = 125, _symbol, alias, interval = '1d', begin = 1627747200000, limit = 1500) {
            while (true) {
                let klineArray = this.parseKlinesData(this.swap_klines_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(价格指数)
        fetchKlinesIndex(sleep = 125, _symbol, alias, interval = '1d', begin = 1627747200000, limit = 1500) {
            while (true) {
                let klineArray = this.parseKlinesIndexData(this.index_url, _symbol, alias, interval, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin, interval);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }

        // K线数据(资金费率)
        fetchKlinesFunding(sleep = 50, _symbol, alias, begin = 1627747200000, limit = 1000) {
            while (true) {
                let klineArray = this.parseKlinesFundingData(this.funding_url, _symbol, alias, begin, limit);
                deferSleep(sleep);
                let dataFlag = parseData(klineArray, begin);
                if (typeof dataFlag !== 'number') {
                    return klineArray
                }
                else {
                    begin = dataFlag;
                }
            }
        }
    }


    function getExchanges() {
        // 创建一个注册器实例
        let registry = new ClassRegistry();

        // 注册类
        // registry.register('Binance', Binance, isRun = { spot: [true, 20, false], swap: [true, 125, false], future: [true, 125, false], index: [true, 125, false], funding: [true, 700, false] });
        registry.register('OKX', OKX, isRun = { spot: [true, 150, true], swap: [true, 150, true], future: [true, 150, true], index: [true, 200, true], funding: [true, 200, true], filter: true });
        // registry.register('Bybit', Bybit, isRun = { spot: [true, 100, true], swap: [true, 100, true], future: [false, 100, true], index: [true, 200, true], funding: [true, 200, true] });
        // registry.register('Kraken', Kraken, isRun = { spot: [true, 100, false], swap: [true, 100, true], future: [false, 100, true], index: [true, null, false], funding: [true, 100, false] });
        // registry.register('Crypto', Crypto, isRun = { spot: [true, 350, true], swap: [true, 350, true], future: [false, 350, true], index: [true, null, true], funding: [true, null, true] });
        // registry.register('BitMEX', BitMEX, isRun = { spot: [true, 2000, false], swap: [true, 2000, false], future: [false, 2000, false], index: [true, null, false], funding: [true, 2000, false] });
        // registry.register('Deribit', Deribit, isRun = { spot: [true, 50, false], swap: [true, 50, false], future: [false, 50, false], index: [true, null, false], funding: [true, 50, false] }, isTickers = { spot: false, swap: false, future: false });
        // registry.register('Upbit', Upbit, isRun = { spot: [true, 100, true], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('KuCoin', KuCoin, isRun = { spot: [true, 25, false], swap: [true, 50, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('GateIO', GateIO, isRun = { spot: [true, 50, true], swap: [true, 50, false], future: [true, 50, false], index: [true, null, false], funding: [true, 50, false] });
        // registry.register('HTX', HTX, isRun = { spot: [true, 80, false], swap: [true, 10, false], future: [true, 10, false], index: [true, 10, false], funding: [true, null, false] });
        // registry.register('Bitfinex', Bitfinex, isRun = { spot: [true, 6000, false], swap: [true, 6000, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('MEXC', MEXC, isRun = { spot: [true, 20, false], swap: [true, 100, true], future: [true, null, false], index: [true, 100, true], funding: [true, 100, false] });
        // registry.register('Bitget', Bitget, isRun = { spot: [true, 50, true], swap: [true, 50, true], future: [true, 50, true], index: [true, 50, true], funding: [true, 50, false] });
        // registry.register('Gemini', Gemini, isRun = { spot: [true, 500, false], swap: [true, 500, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] }, isTickers = { spot: false, swap: false });
        // registry.register('LBank', LBank, isRun = { spot: [true, 50, false], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('Bithumb', Bithumb, isRun = { spot: [true, 10, true], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('Coinw', Coinw, isRun = { spot: [true, 50, true], swap: [true, 50, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('BitMart', BitMart, isRun = { spot: [true, 200, false], swap: [true, 200, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('DigiFinex', DigiFinex, isRun = { spot: [true, 200, true], swap: [true, 200, false], future: [true, null, false], index: [true, null, false], funding: [true, 200, false] });
        // registry.register('Coinone', Coinone, isRun = { spot: [true, 50, true], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('BigONE', BigONE, isRun = { spot: [true, 20, true], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('HashKey', HashKey, isRun = { spot: [true, 500, false], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] }, isTickers = { spot: false });
        // registry.register('WOO', WOO, isRun = { spot: [true, 1000, false], swap: [true, 1000, false], future: [true, null, false], index: [true, null, false], funding: [false, 100, false] });
        // registry.register('Poloniex', Poloniex, isRun = { spot: [true, 50, false], swap: [true, 50, false], future: [true, null, false], index: [true, 50, false], funding: [false, 50, false] });
        // registry.register('CoinEx', CoinEx, isRun = { spot: [true, 10, false], swap: [true, 10, false], future: [true, null, false], index: [true, 10, false], funding: [true, 10, false] });
        // registry.register('AscendEx', AscendEx, isRun = { spot: [true, 100, false], swap: [true, 100, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('Backpack', Backpack, isRun = { spot: [true, 200, false], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('HitBTC', HitBTC, isRun = { spot: [true, 50, false], swap: [true, 50, false], future: [true, null, false], index: [true, 50, false], funding: [true, null, false] });
        // registry.register('Bibox', Bibox, isRun = { spot: [true, 10, false], swap: [true, 10, false], future: [true, null, false], index: [true, 10, false], funding: [true, null, false] }, isTickers = { swap: false });
        // registry.register('Korbit', Korbit, isRun = { spot: [true, 20, false], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('dYdX', DYdX, isRun = { spot: [true, null, false], swap: [true, 100, false], future: [true, null, false], index: [true, null, false], funding: [true, 100, false] });
        // registry.register('ApolloX', ApolloX, isRun = { spot: [true, null, false], swap: [true, 125, false], future: [true, null, false], index: [true, 125, false], funding: [true, 50, false] });

        // registry.register('Coinbase', Coinbase, isRun={spot: [true, 50, false], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] }, isTickers={spot: false});
        // registry.register('BinanceUs', BinanceUs, isRun={spot: [true, 50, false], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('Tokocrypto', Tokocrypto, isRun={spot: [true, 50, false], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('BingX', BingX, isRun={spot: [true, 100, false], swap: [true, 100, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('XTCOM', XTCOM, isRun={spot: [true, 50, false], swap: [true, 100, false], future: [true, 100, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('Deepcoin', Deepcoin, isRun={spot: [true, 200, false], swap: [true, 200, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('ProBit', ProBit, isRun={spot: [true, 100, false], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('P2B', P2B, isRun={spot: [true, 100, false], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('OrangeX', OrangeX, isRun={spot: [true, 100, false], swap: [true, 100, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('Biconomy', Biconomy, isRun={spot: [true, 100, false], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('WhiteBIT', WhiteBIT, isRun={spot: [true, 50, false], swap: [true, 50, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('Hotcoin', Hotcoin, isRun={spot: [true, 50, false], swap: [true, 50, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('Bitvavo', Bitvavo, isRun={spot: [true, 80, false], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('Bitrue', Bitrue, isRun={spot: [true, 100, false], swap: [true, 100, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] }, isTickers={swap: false});
        // registry.register('CoinTr', CoinTr, isRun={spot: [true, 100, false], swap: [true, 100, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('Phemex', Phemex, isRun={spot: [true, 50, false], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('Pionex', Pionex, isRun={spot: [true, 100, false], swap: [true, 100, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('Cpatex', Cpatex, isRun={spot: [true, 100, false], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('Coinstore', Coinstore, isRun={spot: [true, 50, false], swap: [true, 50, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('DexTrade', DexTrade, isRun={spot: [true, 100, false], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('Bitbank', Bitbank, isRun={spot: [true, 50, false], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('Bitkub', Bitkub, isRun={spot: [true, 50, false], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('BtcTurkKripto', BtcTurkKripto, isRun={spot: [true, 100, false], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('HashKeyGlobal', HashKeyGlobal,  isRun={spot: [true, 500, false], swap: [true, 500, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('ZKE', ZKE, isRun={spot: [true, 50, false], swap: [true, 50, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] }, isTickers={spot: true, swap: false});
        // registry.register('Websea', Websea, isRun={spot: [true, 100, false], swap: [true, 100, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('PointPay', PointPay, isRun={spot: [true, 50, false], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('Coinlist', Coinlist, isRun={spot: [true, 300, false], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('MAX', MAX, isRun={spot: [true, 50, false], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('Cryptology', Cryptology, isRun={spot: [true, 1000, false], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('Fairdesk', Fairdesk, isRun={spot: [true, null, false], swap: [true, 100, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] }, isTickers={swap: false});

        // 以下交易所无法获取k线数据---------------------------------------------------------------------------------------------------
        // registry.register('Bitstamp', Bitstamp, isRun = { spot: [true, null, false], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('BitFlyer', BitFlyer, isRun = { spot: [true, null, false], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] }, isTickers = { spot: false, swap: false });
        // registry.register('Coincheck', Coincheck, isRun = { spot: [true, null, false], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] });
        // registry.register('Zaif', Zaif, isRun = { spot: [true, null, false], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, null, false] }, isTickers = { spot: false });
        // registry.register('Aevo', Aevo, isRun = { spot: [true, null, false], swap: [true, null, false], future: [true, null, false], index: [true, null, false], funding: [true, 100, false] });

        // registry.register('FameEx', FameEx, isRun={spot: true, swap: true, future: true});
        // registry.register('BinanceTr', BinanceTr, isRun={spot: true, swap: true, future: true});
        // registry.register('CITEX', CITEX, isRun={spot: true, swap: true, future: true});
        // registry.register('LATOKEN', LATOKEN, isRun={spot: true, swap: true, future: true});
        // registry.register('Fastex', Fastex, isRun={spot: true, swap: true, future: true});
        // registry.register('Azbit', Azbit, isRun={spot: true, swap: true, future: true});
        // registry.register('Bitso', Bitso, isRun={spot: true, swap: true, future: true});
        // registry.register('Hibt', Hibt, isRun={spot: true, swap: true, future: true});
        // registry.register('Luno', Luno, isRun={spot: true, swap: true, future: true});
        // registry.register('Indodax', Indodax, isRun={spot: true, swap: true, future: true});
        // registry.register('Currency', Currency, isRun={spot: true, swap: true, future: true});
        // registry.register('CEXIO', CEXIO, isRun={spot: true, swap: true, future: true});
        // 以上交易所无法获取k线数据---------------------------------------------------------------------------------------------------

        // 以下交易所获取k线逻辑未开发-------------------------------------------------------------------------------------------------
        // registry.register('Independent', Independent, isRun={spot: true, swap: true, future: true}, tickers={spot: false});
        // registry.register('Bullish', Bullish, isRun={spot: true, swap: true, future: true});
        // registry.register('OKCoin', OKCoin, isRun={spot: true, swap: true, future: true});
        // registry.register('FMFWIO', FMFWIO, isRun={spot: true, swap: true, future: true});
        // registry.register('MB', MB, isRun={spot: true, swap: true, future: true});
        // registry.register('Bitspay', Bitspay, isRun={spot: true, swap: true, future: true});
        // registry.register('BTCMarkets', BTCMarkets, isRun={spot: true, swap: true, future: true}, tickers={spot: false});
        // registry.register('KoinBx', KoinBx, isRun={spot: true, swap: true, future: true});
        // registry.register('ICRYPEX', ICRYPEX, isRun={spot: true, swap: true, future: true});
        // registry.register('IndoEx', IndoEx, isRun={spot: true, swap: true, future: true});
        // registry.register('BTSE', BTSE, isRun={spot: true, swap: true, future: true});
        // 以上交易所获取k线逻辑未开发------------------------------------------------------------------------------------------------

        // 获取所有类名方法和属性
        return registry.getAllClasses();
    }

    function batchInsert(db, tableType, symbolType, colsArray, dataArray) {
        let sql = `INSERT INTO ${tableType}.${symbolType} (${colsArray.join(",")}) VALUES`;
        let tuple = [];
        for (let i = 0; i < colsArray.length; i++) {
            tuple.push('?');
        }
        sql += '(' + tuple.join(',') + ')';
        let step = 50000
        for (let i = 0; i < dataArray.length; i+=step) {
            let args = [sql]
            args = args.concat(dataArray.slice(i, i+step))
            let ret = db.exec.apply(null, args);
            if (!ret) {
                Log('Error: ', tableType, "-->", "Table: ", symbolType, "Exchange: ", className, dataArray, "#ff0000");
                Log(args)
                throw "STOP"
            } else {
                // Log(tableType, symbolType, ret)
            }
        }
    }

    let cacheUpdate = {};
    function saveToDatabase(db, data, tableType, symbolType, begin, saveType) {
        if (data === undefined || data === null) {
            return 0
        }
        if (tableType === "markets") {
            let marketsArray = [];
            for (let symbolTemp in data) {
                let item = data[symbolTemp];
                marketsArray.push([className, item["Symbol"], item["Alias"], item["Contract"], item["BaseAsset"],
                    item["QuoteAsset"], item["TickSize"], item["AmountSize"], item["PricePrecision"],
                    item["AmountPrecision"], item["MinQty"], item["MaxQty"], item["MinNotional"],
                    item["MaxNotional"], item["CtVal"], item["CtValCcy"], JSON.stringify(item["Info"])]);
            }
            let dataLength = marketsArray.length;
            if (dataLength <= 0) {
                return 0
            }
            let colsArray = ['Exchange', 'Symbol', 'Alias', 'Contract', 'BaseAsset', 'QuoteAsset', 'TickSize', 'AmountSize', 'PricePrecision', 'AmountPrecision', 'MinQty', 'MaxQty', 'MinNotional', 'MaxNotional', 'CtVal', 'CtValCcy', 'Info'];
            batchInsert(db, tableType, symbolType, colsArray, marketsArray);
            Log(tableType, "-->", symbolType, "-->", className,  "-->", "Length: ", dataLength);
            return 0
        }
        else if (tableType === "tickers") {
            let tickersArray = [];
            for (let symbolTemp in data) {
                let item = data[symbolTemp];
                let ts = new Date().getTime();
                let date_time = getIsoString(item["Time"]);
                if (date_time != null) {
                    ts = new Date(date_time).getTime();
                }
                tickersArray.push([className, item["Symbol"], item["Alias"], item["High"], item["Low"], item["Sell"], item["Buy"], item["Last"], item["Open"],
                    item["Volume"], item["QuoteVolume"], ts, JSON.stringify(item["Info"])]);
            }
            let dataLength = tickersArray.length;
            if (dataLength <= 0) {
                return 0
            }
            let colsArray = ['Exchange', 'Symbol', 'Alias', 'High', 'Low', 'Sell', 'Buy', 'Last', 'Open', 'Volume', 'QuoteVolume', 'Time', 'Info'];
            batchInsert(db, tableType, symbolType, colsArray, tickersArray);
            Log(tableType, "-->", symbolType, "-->", className, "-->", "Length: ", dataLength);
            return 0
        }
        else if (tableType === "klines") {
            let klinesArray = [];
            let timeArray = [];
            let repeat = 0;
            let ignore = 0;
            let _symbol = null;
            let _k = null;
            let previousTime = null;
            if (saveType === 0) {
                data.sort((a, b) => b[1] - a[1]); // timestamp high to low
            } else {
                data.sort((a, b) => a[1] - b[1]); // timestamp low to high
            }
            for (let i = 0; i < data.length; i++) {
                let item = data[i];
                if (_symbol === null) {
                    _symbol = item[0];
                    _k = `${className}.${symbolType}.${item[0]}`;
                    previousTime = cacheUpdate[_k] || begin || 0;
                }
                let currentTime = item[1];
                if (saveType === 0) {
                    // 倒序插入
                    if (currentTime >= previousTime) {
                        repeat++;
                    } 
                    else {
                        cacheUpdate[_k] = currentTime;
                    }
                    if (typeof (begin) === 'number' && currentTime >= begin) {
                        ignore++;
                        continue;
                    }
                }
                else if (saveType === 1) {
                    // 正序插入
                    if (currentTime <= previousTime) {
                        repeat++;
                    } 
                    else {
                        cacheUpdate[_k] = currentTime;
                    }
                    if (typeof (begin) === 'number' && currentTime <= begin) {
                        ignore++;
                        continue;
                    }
                }
                else if (saveType === 2) {
                    // 填补倒序插入
                    if (currentTime > previousTime) {
                        repeat++;
                    } 
                    else {
                        cacheUpdate[_k] = currentTime;
                    }
                    if (typeof (begin) === 'number' && currentTime > begin) {
                        ignore++;
                        continue;
                    }
                }
                else if (saveType === 3) {
                    // 填补正序插入
                    if (currentTime < previousTime) {
                        repeat++;
                    } 
                    else {
                        cacheUpdate[_k] = currentTime;
                    }
                    if (typeof (begin) === 'number' && currentTime < begin) {
                        ignore++;
                        continue;
                    }
                }

                if (timeArray.includes(currentTime)) {
                    continue;
                }
                else {
                    if (symbolType === 'funding') {
                        klinesArray.push([className, item[0], BigInt(item[1]), item[2]]);
                    }
                    else {
                        if (item[6] === null) {
                            item[6] = 0;
                        }
                        klinesArray.push([className, item[0], BigInt(item[1]), item[2], item[3], item[4], item[5], item[6]]);
                    }
                    timeArray.push(currentTime);
                }
            }

            let dataLength = klinesArray.length;
            if (dataLength <= 0) {
                return 0
            }
            let colsArray = null;
            if (symbolType === 'funding') {
                colsArray = ['Exchange', 'Symbol', 'Time', 'Rate'];
            }
            else {
                colsArray = ['Exchange', 'Symbol', 'Time', 'Open', 'High', 'Low', 'Close', 'Volume'];
            }
            batchInsert(db, tableType, symbolType, colsArray, klinesArray);
            Log(tableType, "-->", symbolType, "-->", className , "-->", _symbol, "-->", "Length:", dataLength, "Repeat:", repeat, "Ignore:", ignore, 'Previous:', previousTime, (previousTime > 0 ? getCstString(previousTime) : ''));
            return dataLength
        }
    }

    function filterZeroTradeMarkets(exchange, marketsFunction, tickersFunction, filter) {
        let marketsObject = exchange[marketsFunction]();
        if (filter) {
            let tickersObject = exchange[tickersFunction]()
            for (let _symbol in marketsObject) {
                if (typeof(tickersObject[_symbol]) === 'undefined' || tickersObject[_symbol].Volume === 0) {
                    delete marketsObject[_symbol];
                }
            }
        }
        return marketsObject;
    }

    function getData(exchange, methods, marketsObject, klineTimeObject, isRun, interval, stepValue, differNumber, symbolType, db, tableType, table) {
        let total = 0;
        for (let _symbol in marketsObject) {
            let item = marketsObject[_symbol];
            if (_symbol !== 'axs_usdt.swap') {
                continue
            }

            // if (_symbol !== 'btc_usdt' &&  _symbol !== 'btc_usdt.swap') {
            //     continue
            // }
            let alias = item['Alias'];
            if (symbolType === 'index') {
                _symbol = _symbol.split('.')[0] + '.index'
            }
            else if (symbolType === 'funding') {
                _symbol = _symbol.split('.')[0] + '.funding'
            }

            let minTime = null;
            let maxTime = null;
            let begin = undefined;
            let klinesArray = null;
            if (_symbol in klineTimeObject) {
                minTime = klineTimeObject[_symbol][0];
                maxTime = klineTimeObject[_symbol][1];
            }
            if (isRun[symbolType][2]) {
                if (!twoWayArray.includes(_symbol)) {
                    Log('Remind Start retrieving the k-line data in reverse order -->', tableType, "-->", table, "-->", className , "-->", _symbol, "#00ff00");
                    if (minTime !== null) {
                        begin = minTime;
                    }
                    else {
                        begin = getTimestamp(interval);
                    }
                    let retryNumber = 0;
                    while (true) {
                        if (symbolType === 'funding') {
                            klinesArray = exchange[methods](isRun[symbolType][1] * multiple, _symbol, alias, begin);
                        }
                        else {
                            klinesArray = exchange[methods](isRun[symbolType][1] * multiple, _symbol, alias, interval, begin);
                        }
                        if (!Array.isArray(klinesArray)) {
                            Log('Error There was an error in the request response -->', tableType, "-->", table, "-->", className , "-->", _symbol, "-->", 
                            "Url:", showUrl, "Response:", showResponse, "#ff0000");
                            break;
                        }
                        klinesArray.sort((a, b) => a[1] - b[1]);  // Sort by time
                        let dataLength = klinesArray.length;
                        if (dataLength === 0) {
                            retryNumber += 1;
                            if (retryNumber <= 5) {
                                continue;
                            }
                            else {
                                Log('Remind Obtaining k-line data in reverse order is complete -->', tableType, "-->", table, "-->", className , "-->", _symbol, "#00ff00");
                                twoWayArray.push(_symbol);
                                retryNumber = 0;
                                break;
                            }
                        }
                        else if (dataLength === 1) {
                            let onlyTime = klinesArray[0][1];
                            if (onlyTime === begin) {
                                Log('Warnings The k-line array contains only the current begin -->', tableType, "-->", table, "-->", className , "-->", _symbol, "-->", 
                                "Length:", dataLength, "Begin:", begin, getCstString(begin), "Url:", showUrl, "#ffff00");
                                begin -= stepValue;
                                continue;
                            }
                        }
                        else if (dataLength > 1) {
                            let timeArray = klinesArray.map(subArray => subArray[1]);
                            if (!timeArray.includes(begin)) {
                                Log('Warnings The k-line array does not contain begin -->', tableType, "-->", table, "-->", className , "-->", _symbol, "-->", 
                                "Length:", dataLength, "Begin:", begin, getCstString(begin), "Url:", showUrl, "#ffff00");
                            }
                            let lastTime = klinesArray[dataLength - 1][1];
                            if (lastTime >= getTimestamp(interval)) {
                                klinesArray.pop();
                                Log('Warnings The last data time is greater than or equal to the current time -->', tableType, "-->", table, "-->", className , "-->", _symbol, "-->", 
                                "Length:", dataLength, "LastTime:", lastTime, getCstString(lastTime), "Url:", showUrl, "#ffff00");
                            }
                        }
                        total += saveToDatabase(db, klinesArray, tableType, table, begin, 0);
                        let select = `SELECT min(Time) as min_time from ${tableType}.${table} WHERE Exchange = '${className}' and Symbol= '${_symbol}';`;
                        let result = db.exec(select);
                        if (result) {
                            let valuesArray = result['values'];
                            if (Array.isArray(valuesArray) && valuesArray.length > 0) {
                                let tempTime = valuesArray[0][0];
                                if (tempTime === null || tempTime === 0) {
                                    break;
                                }
                                minTime = tempTime;
                                begin = minTime;
                            }
                        }
                    }
                }
                Log('Remind Start to get k-line data in positive order -->', tableType, "-->", table, "-->", className , "-->", _symbol, "#00ff00");
                let allKlinesArray = [];
                begin = getTimestamp(interval);
                while (true) {
                    if (symbolType === 'funding') {
                        klinesArray = exchange[methods](isRun[symbolType][1] * multiple, _symbol, alias, begin);
                    }
                    else {
                        klinesArray = exchange[methods](isRun[symbolType][1] * multiple, _symbol, alias, interval, begin);
                    }
                    if (!Array.isArray(klinesArray)) {
                        Log('Error There was an error in the request response -->', tableType, "-->", table, "-->", className , "-->", _symbol, "-->", 
                        "Url:", showUrl, "Response:", showResponse, "#ff0000");
                        allKlinesArray = [];
                        break;
                    }
                    klinesArray.sort((a, b) => a[1] - b[1]);  // Sort by time
                    let dataLength = klinesArray.length;
                    if (maxTime === null) {
                        let select = `SELECT max(Time) as max_time from ${tableType}.${table} WHERE Exchange = '${className}' and Symbol= '${_symbol}';`;
                        let result = db.exec(select);
                        if (result) {
                            let valuesArray = result['values'];
                            if (Array.isArray(valuesArray) && valuesArray.length > 0) {
                                let tempTime = valuesArray[0][0];
                                if (tempTime === null || tempTime === 0) {
                                    break;
                                }
                                maxTime = tempTime;
                            }
                        }
                    }
                    if (dataLength > 0 && maxTime !== null) {
                        let lastTime = klinesArray[dataLength - 1][1];
                        if (lastTime >= getTimestamp(interval)) {
                            klinesArray.pop();
                            Log('Warnings The last data time is greater than or equal to the current time -->', tableType, "-->", table, "-->", className , "-->", _symbol, "-->", 
                            "Length:", dataLength, "LastTime:", lastTime, getCstString(lastTime), "Url:", showUrl, "#ffff00");
                        }

                        allKlinesArray.push(klinesArray);

                        let timeArray = klinesArray.map(subArray => subArray[1]);
                        if (!timeArray.includes(maxTime)) {
                            Log('Warnings The k-line array does not contain begin -->', tableType, "-->", table, "-->", className , "-->", _symbol, "-->", 
                            "Length:", dataLength, "Begin:", begin, getCstString(begin), "maxTime:", maxTime, getCstString(maxTime), "Url:", showUrl, "#ffff00");
                            dataLength = klinesArray.length;
                            if (dataLength > 0) {
                                begin = klinesArray[0][1];
                            }
                            else {
                                begin -= stepValue;
                            }
                        }
                        else {
                            Log('Remind The acquisition of K-line data in positive order is complete -->', tableType, "-->", table, "-->", className , "-->", _symbol, "#00ff00");
                            break;
                        }
                    }
                }
                let newKlinesArray = allKlinesArray.flat();
                newKlinesArray.sort((a, b) => a[1] - b[1]);  // Sort by time
                total += saveToDatabase(db, newKlinesArray, tableType, table, (maxTime||begin), 1);
            }
            else {
                Log('Remind Start to get k-line data in positive order -->', tableType, "-->", table, "-->", className , "-->", _symbol, "#00ff00");
                if (maxTime !== null) {
                    begin = maxTime;
                }
                while (true) {
                    if (symbolType === 'funding') {
                        klinesArray = exchange[methods](isRun[symbolType][1] * multiple, _symbol, alias, begin);
                    }
                    else {
                        klinesArray = exchange[methods](isRun[symbolType][1] * multiple, _symbol, alias, interval, begin);
                    }
                    if (!Array.isArray(klinesArray)) {
                        Log('Error There was an error in the request response -->', tableType, "-->", table, "-->", className , "-->", _symbol, "-->", 
                        "Url:", showUrl, "Response:", showResponse, "#ff0000");
                        break;
                    }
                    klinesArray.sort((a, b) => a[1] - b[1]);  // Sort by time
                    let dataLength = klinesArray.length;
                    if (dataLength > 0) {
                        let lastTime = klinesArray[dataLength - 1][1];
                        if (lastTime >= getTimestamp(interval)) {
                            klinesArray.pop();
                            Log('Warnings The last data time is greater than or equal to the current time -->', tableType, "-->", table, "-->", className , "-->", _symbol, "-->", 
                            "Length:", dataLength, "LastTime:", lastTime, getCstString(lastTime), "Url:", showUrl, "#ffff00");
                        }
                        if (begin !== undefined) {
                            let timeArray = klinesArray.map(subArray => subArray[1]);
                            if (!timeArray.includes(begin)) {
                                Log('Warnings The k-line array does not contain begin -->', tableType, "-->", table, "-->", className , "-->", _symbol, "-->", 
                                "Length:", dataLength, "Begin:", begin, getCstString(begin), "Url:", showUrl, "#ffff00");
                            }
                        }
                    }
                    total += saveToDatabase(db, klinesArray, tableType, table, begin, 1);
                    let select = `SELECT max(Time) as max_time from ${tableType}.${table} WHERE Exchange = '${className}' and Symbol= '${_symbol}';`;
                    let result = db.exec(select);
                    if (result) {
                        let valuesArray = result['values'];
                        if (Array.isArray(valuesArray) && valuesArray.length > 0) {
                            let tempTime = valuesArray[0][0];
                            if (tempTime === null || tempTime === 0) {
                                break;
                            }
                            maxTime = tempTime;
                            begin = maxTime;
                        }
                    }
                    if (maxTime !== null && maxTime >= getTimestamp(interval) - differNumber) {
                        Log('Remind The acquisition of K-line data in positive order is complete -->', tableType, "-->", table, "-->", className , "-->", _symbol, "#00ff00");
                        break;
                    }
                }
            }
        }
        return total
    }

    function leakFilling(exchange, methods, marketsObject, isRun, interval, stepValue, symbolType, db, tableType, table) {
        for (let _symbol in marketsObject) {
            let item = marketsObject[_symbol];
            let alias = item['Alias'];
            if (symbolType === 'index') {
                _symbol = _symbol.split('.')[0] + '.index'
            }
            let withoutArray = [];
            let select = `SELECT Time FROM (SELECT arrayJoin(range(min(Time), max(Time), toInt64(${stepValue}))) AS Time FROM ${tableType}.${table} WHERE Exchange='${className}' and Symbol='${_symbol}') 
                            WHERE Time NOT IN (SELECT Time FROM (SELECT Time FROM ${tableType}.${table} WHERE Exchange='${className}' and Symbol='${_symbol}')) order by Time asc limit 10000;`;
            let result = db.exec(select);
            if (result) {
                let valuesArray = result['values'];
                if (Array.isArray(valuesArray)) {
                    for (let i = 0; i < valuesArray.length; i++) {
                        withoutArray.push(valuesArray[i][0]);
                    }
                }
            }
            if(withoutArray.length <= 0) {
                continue;
            }
            if (isRun[symbolType][2]) {
                withoutArray.reverse();
            }
            Log('Remind Start Fill in the k-line data -->', tableType, "-->", table, "-->", className , "-->", _symbol, "#00ff00");
            let findArray = [];
            for (let i = 0; i < withoutArray.length; i++) {
                let begin = withoutArray[i];
                if (findArray.includes(begin)) {
                    continue;
                }
                let klinesArray = exchange[methods](isRun[symbolType][1] * multiple, _symbol, alias, interval, begin);
                if (!Array.isArray(klinesArray)) {
                    Log('Error There was an error in the request response -->', tableType, "-->", table, "-->", className , "-->", _symbol, "-->", 
                    "Url:", showUrl, "Response:", showResponse, "#ff0000");
                    break;
                }
                klinesArray.sort((a, b) => a[1] - b[1]);  // Sort by time
                let dataLength = klinesArray.length;
                if (dataLength > 0) {
                    let tempKlinesArray = [];
                    klinesArray.map(subArray => {
                        let tempTime = subArray[1];
                        if (withoutArray.includes(tempTime)) {
                            findArray.push(tempTime);
                            tempKlinesArray.push(subArray);
                        }
                    });
                    if (!findArray.includes(begin)) {
                        Log('Warnings The k-line array does not contain begin -->', tableType, "-->", table, "-->", className , "-->", _symbol, "-->", 
                        "Length:", dataLength, "Begin:", begin, getCstString(begin), "Url:", showUrl, "#ffff00");
                    }
                    if (isRun[symbolType][2]) {
                        saveToDatabase(db, tempKlinesArray, tableType, table, begin, 2);
                    }
                    else {
                        saveToDatabase(db, tempKlinesArray, tableType, table, begin, 3);
                    }
                }
            }
            Log('Remind End Fill in the k-line data -->', tableType, "-->", table, "-->", className , "-->", _symbol, "#00ff00");
        }
    }

    let twoWayArray = [];
    let progressMap = {};
    function update(exchange, methodsArray, isRun, db, tableType, table) {
        let total = 0;
        for (let i = 0; i < methodsArray.length; i++) {
            let methods = methodsArray[i];
            if (tableType === 'markets') {
                if (methods === 'getMarketsSpot' && isRun['spot'][0] === true) {
                    let marketsObject = exchange.getMarketsSpot();
                    saveToDatabase(db, marketsObject, tableType, 'spot', null, null);
                }
                else if (methods === 'getMarketsSwap' && isRun['swap'][0] === true) {
                    let marketsSwapObject = exchange.getMarketsSwap();
                    let marketsFutureObject = {};
                    if (methodsArray.includes('getMarketsFuture') && isRun['future'][0] === true) {
                        marketsFutureObject = exchange.getMarketsFuture();
                    }
                    let marketsObject = Object.assign({}, marketsSwapObject, marketsFutureObject);
                    saveToDatabase(db, marketsObject, tableType, 'future', null, null);
                }
            }
            else if (tableType === 'tickers') {
                if (methods === 'getTickersSpot' && isRun['spot'][0] === true) {
                    let tickersObject = exchange.getTickersSpot();
                    saveToDatabase(db, tickersObject, tableType, 'spot', null, null);
                }
                else if (methods === 'getTickersSwap' && isRun['swap'][0] === true) {
                    let tickersSwapObject = exchange.getTickersSwap();
                    let tickersFutureObject = {};
                    if (methodsArray.includes('getTickersFuture') && isRun['future'][0] === true) {
                        tickersFutureObject = exchange.getTickersFuture();
                    }
                    let tickersObject = Object.assign({}, tickersSwapObject, tickersFutureObject);
                    saveToDatabase(db, tickersObject, tableType, 'future', null, null);
                }
            }
            else if (tableType === 'klines') {
                let symbolType = null;
                let marketsObject = null;
                let spotArray = ['spot_1d', 'spot_15m', 'spot_1m'];
                let futureArray = ['future_1d', 'future_15m', 'future_1m'];
                if (methods === 'fetchKlinesSpot' && isRun['spot'][0] === true && spotArray.includes(table)) {
                    marketsObject = filterZeroTradeMarkets(exchange, 'getMarketsSpot', 'getTickersSpot', isRun['filter']);
                    symbolType = 'spot';
                }
                else if (methods === 'fetchKlinesSwap' && isRun['swap'][0] === true && futureArray.includes(table)) {
                    marketsObject = filterZeroTradeMarkets(exchange, 'getMarketsSwap', 'getTickersSwap', isRun['filter']);
                    symbolType = 'swap';
                }
                else if (methods === 'fetchKlinesFuture' && isRun['future'][0] === true && futureArray.includes(table)) {
                    marketsObject = filterZeroTradeMarkets(exchange, 'getMarketsFuture', 'getTickersFuture', isRun['filter']);
                    symbolType = 'future';
                }
                else if (methods === 'fetchKlinesIndex' && isRun['swap'][0] === true && isRun['index'][0] === true && futureArray.includes(table)) {
                    marketsObject = filterZeroTradeMarkets(exchange, 'getMarketsSwap', 'getTickersSwap', isRun['filter']);
                    symbolType = 'index';
                }
                else if (methods === 'fetchKlinesFunding' && isRun['swap'][0] === true && isRun['funding'][0] === true && table === 'funding') {
                    marketsObject = filterZeroTradeMarkets(exchange, 'getMarketsSwap', 'getTickersSwap', isRun['filter']);
                    symbolType = 'funding';
                }

                if (symbolType === null || Object.keys(marketsObject).length === 0) {
                    continue;
                }

                let stepValue = null;
                let differNumber = null;
                let interval = null;
                if (table.includes('_')) {
                    interval = table.split('_')[1];
                }
                else {
                    interval = table;
                }
                if (interval === '1m') {
                    stepValue = 60000;
                    differNumber = stepValue * 10;  
                }
                else if (interval === '15m') {
                    stepValue = 900000;
                    differNumber = stepValue * 4; 
                }
                else if (interval === '1d'){
                    stepValue = 86400000;
                    differNumber = stepValue * 2;
                }
                else {
                    stepValue = 3600000;
                    differNumber = stepValue * 8;
                }

                let totalProgress = 0;
                let totalSymbols = 0;
                let pType = symbolType;
                if (symbolType === 'swap' || symbolType === 'future' || symbolType === 'index') {
                    pType = 'future';
                }
                let klineTimeObject = {};
                let select = `SELECT Symbol, min(Time) as min_time, max(Time) as max_time from ${tableType}.${table} WHERE Exchange = '${className}' GROUP BY Symbol;`;
                while (true) {
                    let result = db.exec(select);
                    if (result) {
                        let valuesArray = result['values'];
                        if (Array.isArray(valuesArray)) {
                            for (let i = 0; i < valuesArray.length; i++) {
                                klineTimeObject[valuesArray[i][0]] = [valuesArray[i][1], valuesArray[i][2]];
                                if (valuesArray[i][0].replace('.funding', '.swap') in marketsObject) {
                                    totalProgress += (valuesArray[i][2] - valuesArray[i][1]) / (getTimestamp(interval) - valuesArray[i][1]);
                                    totalSymbols += 1;
                                }
                            }
                            if (totalSymbols > 0) {
                                progressMap[pType] = { progress: totalProgress / totalSymbols, symbols: totalSymbols };
                                __threadSetData(__threadId(), 'Progress', progressMap);
                            }
                            break
                        }
                    }
                    Sleep(5000)
                }
                total += getData(exchange, methods, marketsObject, klineTimeObject, isRun, interval, stepValue, differNumber, symbolType, db, tableType, table); // 获取数据
                if (symbolType !== 'funding') {
                    //leakFilling(exchange, methods, marketsObject, isRun, interval, stepValue, symbolType, db, tableType, table) // 填补数据
                }
            }
        }
        return total < 50;
    }

    function checkAPI(exchange, methodsArray, isRun) {
        if (task === 'markets') {
            for (let i = 0; i < methodsArray.length; i++) {
                let methods = methodsArray[i];
                if (methods === 'getMarketsSpot' && isRun['spot'][0] === true) {
                    let marketsObject = exchange.getMarketsSpot();
                    let dataLength = Object.keys(marketsObject).length;
                    if (dataLength === 0) {
                        Log("Error: ", "tableType: markets.spot", "Exchange: ", className, "Length: ", dataLength, "#ff0000");
                        throw "market spot returns empty data";
                    }
                    let _symbol = Object.keys(marketsObject)[0];
                    let item = marketsObject[_symbol];
                    let alias = item['Alias'];
                    if (methodsArray.includes('fetchKlinesSpot')) {
                        let klinesArray = exchange.fetchKlinesSpot(isRun['spot'][1], _symbol, alias);
                        if (klinesArray === undefined) {
                            continue;
                            Log("Error: ", "tableType: klines.spot", "Exchange: ", className, "klinesArray: ", klinesArray, "#ff0000");
                            throw "klines spot returns empty data";
                        }
                        let dataLength = klinesArray.length;
                        if (dataLength === 0) {
                            Log("Error: ", "tableType: klines.spot", "Exchange: ", className, "Length: ", dataLength, "#ff0000");
                            throw "klines spot returns empty data";
                        }
                    }
                }
                else if (methods === 'getMarketsSwap' && isRun['swap'][0] === true) {
                    let marketsObject = exchange.getMarketsSwap();
                    let dataLength = Object.keys(marketsObject).length;
                    if (dataLength === 0) {
                        Log("Error: ", "tableType: markets.swap", "Exchange: ", className, "Length: ", dataLength, "#ff0000");
                        throw "markets swap returns empty data";
                    }
                    let _symbol = Object.keys(marketsObject)[0];
                    let item = marketsObject[_symbol];
                    let alias = item['Alias'];
                    if (methodsArray.includes('fetchKlinesSwap')) {
                        let klinesArray = exchange.fetchKlinesSwap(isRun['swap'][1], _symbol, alias);
                        if (klinesArray === undefined) {
                            continue;
                            Log("Error: ", "tableType: klines.swap", "Exchange: ", className, "klinesArray: ", klinesArray, "#ff0000");
                            throw "klines swap returns empty data";
                        }
                        let dataLength = klinesArray.length;
                        if (dataLength === 0) {
                            Log("Error: ", "tableType: klines.swap", "Exchange: ", className, "Length: ", dataLength, "#ff0000");
                            throw "klines swap returns empty data";
                        }
                    }
                    else if (methodsArray.includes('fetchKlinesIndex')) {
                        let klinesArray = exchange.fetchKlinesIndex(isRun['swap'][1], _symbol, alias);
                        if (klinesArray === undefined) {
                            continue;
                            Log("Error: ", "tableType: klines.index", "Exchange: ", className, "klinesArray: ", klinesArray, "#ff0000");
                            throw "klines index returns empty data";
                        }
                        let dataLength = klinesArray.length;
                        if (dataLength === 0) {
                            Log("Error: ", "tableType: klines.index", "Exchange: ", className, "Length: ", dataLength, "#ff0000");
                            throw "klines index returns empty data";
                        }
                    }
                    else if (methodsArray.includes('fetchKlinesFunding')) {
                        let klinesArray = exchange.fetchKlinesFunding(isRun['swap'][1], _symbol, alias);
                        if (klinesArray === undefined) {
                            continue;
                            Log("Error: ", "tableType: klines.funding", "Exchange: ", className, "klinesArray: ", klinesArray, "#ff0000");
                            throw "klines funding returns empty data";
                        }
                        let dataLength = klinesArray.length;
                        if (dataLength === 0) {
                            Log("Error: ", "tableType: klines.funding", "Exchange: ", className, "Length: ", dataLength, "#ff0000");
                            throw "klines funding returns empty data";
                        }
                    }
                }
                else if (methods === 'getMarketsFuture' && isRun['future'][0] === true) {
                    let marketsObject = exchange.getMarketsFuture();
                    let dataLength = Object.keys(marketsObject).length;
                    if (dataLength === 0) {
                        Log("Error: ", "tableType: markets.future", "Exchange: ", className, "Length: ", dataLength, "#ff0000");
                        throw "markets future returns empty data";
                    }
                    let _symbol = Object.keys(marketsObject)[0];
                    let item = marketsObject[_symbol];
                    let alias = item['Alias'];
                    if (methodsArray.includes('fetchKlinesFuture')) {
                        let klinesArray = exchange.fetchKlinesFuture(isRun['future'][1], _symbol, alias);
                        if (klinesArray === undefined) {
                            continue;
                            Log("Error: ", "tableType: klines.future", "Exchange: ", className, "klinesArray: ", klinesArray, "#ff0000");
                            throw "klines future returns empty data";
                        }
                        let dataLength = klinesArray.length;
                        if (dataLength === 0) {
                            Log("Error: ", "tableType: klines.future", "Exchange: ", className, "Length: ", dataLength, "#ff0000");
                            throw "klines future returns empty data";
                        }
                    }
                }
            }
        }
    }

    let allClasses = getExchanges();
    if (typeof (fd) !== 'number') {
        return allClasses
    }
    let isClasses = null;
    for (let i = 0; i < allClasses.length; i++) {
        let eachClasses = allClasses[i];
        if (eachClasses.className != className) {
            continue;
        }
        else {
            isClasses = eachClasses;
        }
    }
    let marketsArray = ['getMarketsSpot', 'getMarketsSwap', 'getMarketsFuture'];
    let tickersArray = ['getTickersSpot', 'getTickersSwap', 'getTickersFuture'];
    let klinesArray = ['fetchKlinesSpot', 'fetchKlinesSwap', 'fetchKlinesFuture', 'fetchKlinesIndex'];
    let fundingArray = ['fetchKlinesFunding'];
    let exchange = new isClasses['classDefinition']();
    let methodsArray = isClasses['methods'];
    let is_run = isClasses['isRun'];

    // checkAPI(exchange, methodsArray, is_run); // Check whether the exchange interface is working

    let db = Dial(fd); // Connecting to a database

    Log("threadId: ", __threadId(), "running for", className, "task: ", task);
    while (true) {
        if (task === 'markets' && marketsArray.some(value => methodsArray.includes(value))) {
            update(exchange, methodsArray, is_run, db, 'markets', null, multiple);
            count.markets += 1;
            Sleep(3600000);
        }
        else if (task === 'tickers' && tickersArray.some(value => methodsArray.includes(value))) {
            update(exchange, methodsArray, is_run, db, 'tickers', null, multiple);
            count.tickers += 1;
            Sleep(60000);
        }
        else if (task === 'spot_1d' && klinesArray.some(value => methodsArray.includes(value))) {
            let isSleep = update(exchange, methodsArray, is_run, db, 'klines', task, multiple);
            count.spot_1d += 1;
            if (isSleep) {
                Sleep(3600000);
            }
        }
        else if (task === 'spot_15m' && klinesArray.some(value => methodsArray.includes(value))) {
            let isSleep = update(exchange, methodsArray, is_run, db, 'klines', task, multiple);
            count.spot_15m += 1;

            if (isSleep) {
                Sleep(300000);
            }
        }
        else if (task === 'spot_1m' && klinesArray.some(value => methodsArray.includes(value))) {
            let isSleep = update(exchange, methodsArray, is_run, db, 'klines', task, multiple);
            count.spot_1m += 1;
            if (isSleep) {
                Sleep(60000);
            }
        }
        else if (task === 'future_1d' && klinesArray.some(value => methodsArray.includes(value))) {
            let isSleep = update(exchange, methodsArray, is_run, db, 'klines', task, multiple);
            count.future_1d += 1;
            if (isSleep) {
                Sleep(3600000);
            }
        }
        else if (task === 'future_15m' && klinesArray.some(value => methodsArray.includes(value))) {
            let isSleep = update(exchange, methodsArray, is_run, db, 'klines', task, multiple);
            count.future_15m += 1;
            if (isSleep) {
                Sleep(300000);
            }
        }
        else if (task === 'future_1m' && klinesArray.some(value => methodsArray.includes(value))) {
            let isSleep = update(exchange, methodsArray, is_run, db, 'klines', task, multiple);
            count.future_1m += 1;
            if (isSleep) {
                Sleep(60000);
            }
        }
        else if (task === 'funding' && fundingArray.some(value => methodsArray.includes(value))) {
            let isSleep = update(exchange, methodsArray, is_run, db, 'klines', task, multiple);
            count.funding += 1;
            if (isSleep) {
                Sleep(600000);
            }
        }
        Sleep(10000) // force sleep avoid dead loop
    }
}

function prepare_database_ck(db, layouts) {
    for (let schema in layouts) {
        db.exec(`CREATE DATABASE IF NOT EXISTS ${schema}`);
        layouts[schema].forEach(table => {
            if (schema === 'markets') {
                let create_table = `CREATE TABLE IF NOT EXISTS ${schema}.${table} (
                                    Exchange varchar(100), 
                                    Symbol varchar(100), 
                                    Alias varchar(100), 
                                    Contract Nullable(varchar(100)), 
                                    BaseAsset varchar(50), 
                                    QuoteAsset varchar(50), 
                                    TickSize Nullable(Float64), 
                                    AmountSize Nullable(Float64), 
                                    PricePrecision Nullable(Float64), 
                                    AmountPrecision Nullable(Float64), 
                                    MinQty Nullable(Float64), 
                                    MaxQty Nullable(Float64), 
                                    MinNotional Nullable(Float64), 
                                    MaxNotional Nullable(Float64), 
                                    CtVal Nullable(Float64), 
                                    CtValCcy Nullable(varchar(100)), 
                                    Info text) 
                                    ENGINE = ReplacingMergeTree ORDER BY (Exchange, Symbol);`;
                db.exec(create_table);
            }
            else if (schema === 'tickers') {
                let create_table = `CREATE TABLE IF NOT EXISTS ${schema}.${table} (
                                    Exchange varchar(100), 
                                    Symbol varchar(100), 
                                    Alias varchar(100), 
                                    High Nullable(Float64), 
                                    Low Nullable(Float64), 
                                    Sell Nullable(Float64), 
                                    Buy Nullable(Float64), 
                                    Last Nullable(Float64), 
                                    Open Nullable(Float64), 
                                    Volume Nullable(Float64), 
                                    QuoteVolume Nullable(Float64), 
                                    Time Nullable(bigint), 
                                    Info text) 
                                    ENGINE = ReplacingMergeTree ORDER BY (Exchange, Symbol);`;
                db.exec(create_table);
            }
            else if (schema === 'klines') {
                if (table === 'funding') {
                    let create_table = `CREATE TABLE IF NOT EXISTS ${schema}.${table} (
                                        Exchange varchar(100), 
                                        Symbol varchar(100), 
                                        Time bigint,  
                                        Rate Float64
                                        ) ENGINE = ReplacingMergeTree PARTITION BY Exchange ORDER BY (Exchange, Symbol, Time);`;
                    db.exec(create_table);
                }
                else {
                    let create_table = `CREATE TABLE IF NOT EXISTS ${schema}.${table} (
                                        Exchange varchar(100), 
                                        Symbol varchar(100), 
                                        Time bigint, 
                                        Open double precision, 
                                        High double precision, 
                                        Low double precision, 
                                        Close double precision, 
                                        Volume double precision
                                        ) ENGINE = ReplacingMergeTree PARTITION BY Exchange ORDER BY (Exchange, Symbol, Time);`;
                    db.exec(create_table);
                }
            }
        });
    }
}

function main() {
    LogReset();
    LogStatus("running")
    let db = Dial(DBURL);
    if (!db) {
        throw "Open database error";
    }
    Log("prepare database", db.exec("select version()").values[0][0]);

    let classArray = threadFetch();

    let layouts = {
        'markets': ['spot', 'future'], 'tickers': ['spot', 'future'],
        'klines': ['spot_1d', 'future_1d', 'spot_15m', 'future_15m', 'spot_1m', 'future_1m', 'funding']
    };

    let dbType = null;
    if (DBURL.indexOf("clickhouse") === 0) {
        dbType = 'clickhouse'
        prepare_database_ck(db, layouts);
    } 
    else {
        throw "database protocol not support";
    }
    Log("prepare database", dbType, "OK");

    let multiple = 5; // Delay multiple, multi-thread use, single thread can be set to 1 times

    let symbolType = ['markets', /*'tickers'*/, 'spot_1d', 'spot_15m', 'spot_1m', 'future_1d', 'future_15m', 'future_1m', 'funding'];

    let tids = [];
    classArray.forEach(object => {
        let className = object.className;
        symbolType.forEach(task => {
            Log("create thread for", className, "task:", task);
            let count = { markets: 0, tickers: 0, spot_1d: 0, spot_15m: 0, spot_1m: 0, future_1d: 0, future_15m: 0, future_1m: 0, funding: 0, http_query: 0, http_error: 0, total_bytes: 0 };
            tids.push(__Thread(threadFetch, className, task, db.fd(), count, multiple, Proxy));
        });
    });

    let show_table = { type: 'table', title: 'Tasks', cols: ['exchange', 'markets', 'tickers', 'spot_1d', 'spot_15m', 'spot_1m', 
    'future_1d', 'future_15m', 'future_1m', 'funding', 'http_query', 'http_error', 'RX(GB)', 'last'], rows: [] };
    let thread_table = { type: 'table', title: 'Status', cols: ['thread', 'markets', 'task', 'progress', 'request', 'time', 'url'], rows: [] };
    while (true) {
        let table_dict = {};
        show_table.rows = [];
        thread_table.rows = [];

        tids.forEach(tid => {
            let st = __threadGetData(tid, 'Status');
            if (st) {
                let pInfo = __threadGetData(tid, 'Progress') || {};
                let pInfoItem = [];
                Object.keys(pInfo).sort().forEach(item => {
                    pInfoItem.push(`${item}: symbols(${pInfo[item].symbols}),progress(${(pInfo[item].progress * 100).toFixed(3)}%)`);
                })
                thread_table.rows.push([tid, st.className, st.task, pInfoItem.join('/'), st.count.http_query, st.last, st.url]);
                if (st.className in table_dict) {
                    table_dict[st.className][1] += st.count.markets;
                    table_dict[st.className][2] += st.count.tickers;
                    table_dict[st.className][3] += st.count.spot_1d;
                    table_dict[st.className][4] += st.count.spot_15m;
                    table_dict[st.className][5] += st.count.spot_1m;
                    table_dict[st.className][6] += st.count.future_1d;
                    table_dict[st.className][7] += st.count.future_15m;
                    table_dict[st.className][8] += st.count.future_1m;
                    table_dict[st.className][9] += st.count.funding;
                    table_dict[st.className][10] += st.count.http_query;
                    table_dict[st.className][11] += st.count.http_error;
                    table_dict[st.className][12] += st.count.total_bytes;
                    let dateString = table_dict[st.className][13].replace(' ', 'T');
                    if (new Date(dateString) < new Date(st.last)) {
                        table_dict[st.className][10] = st.last;
                    }
                }
                else {
                    table_dict[st.className] = [
                        st.className, st.count.markets, st.count.tickers, 
                        st.count.spot_1d, st.count.spot_15m, st.count.spot_1m, 
                        st.count.future_1d, st.count.future_15m, st.count.future_1m, 
                        st.count.funding, st.count.http_query, st.count.http_error, 
                        st.count.total_bytes, st.last
                        ];
                }
            }
        });
        for (let className in table_dict) {
            let item = table_dict[className];
            item[12] = (item[12] / 1024 / 1024 / 1024).toFixed(4);
            show_table.rows.push(item);
        }
        LogStatus('`' + JSON.stringify([show_table, thread_table]) + '`');
        LogReset(10000)
        Sleep(5000);
    }
}
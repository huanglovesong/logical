

var express = require('express');
var cheerio = require('cheerio');
var request = require('request');
var superagent = require('superagent');
const cookieParser = require("cookie-parser");

var app = express();
app.use(cookieParser());
var allowCrossDomain = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); //*表示允许的域名地址，本地则为'http://localhost'
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Content-Length, Authorization, X-Powered-By, Accept,X-Requested-With");
    res.header("X-Powered-By", ' 3.2.1')
    res.header("Content-Type", "application/json;charset=utf-8");
    next();
};
app.use(allowCrossDomain);//运用跨域的中间件
app.get('/', function (req, res, next) {
    const { productId, sck, wholesale_sid, contractId } = req.query;
    // 变量sck，Cookie
    // 腾讯微云—T-689-CCH-20190326-02：https://dcm.qq.com/assets/query/1450020339?subMerchantId=0&sck=3d214cdcd0fb83e701b6c5b90217ac81&r=0.34544887090947785
    // QQ增值业务—T-688-CCH-20190320-02https://dcm.qq.com/assets/query/1450020230/T-688-CCH-20190320-02?subMerchantId=0&sck=3d214cdcd0fb83e701b6c5b90217ac81&r=0.3626765784752495
    let url = `https://dcm.qq.com/assets/query/${productId}${contractId ? `/${contractId}` : ''}?subMerchantId=0&sck=${sck}&r=${new Date().getTime()}`;
    console.log(url, 11111)
    superagent.get(url)
        // .set('Content-Type', 'application/json;charset=UTF-8')
        .set("Cookie", `wholesale_sid=${wholesale_sid}`)
        .end(function (err, sres) {
            // 常规的错误处理
            if (err) {
                return next(err);
            }
            // sres.text 里面存储着网页的 html 内容，将它传给 cheerio.load 之后
            // 就可以得到一个实现了 jquery 接口的变量，我们习惯性地将它命名为 `$`
            // 剩下就都是 jquery 的内容了
            // var $ = cheerio.load(sres.text);
            // var items = [];
            // $('#topic_list .topic_title').each(function (idx, element) {
            //     var $element = $(element);
            //     items.push({
            //         title: $element.attr('title'),
            //         href: $element.attr('href')
            //     });
            // });
            // res.send(sres.text);
            var errorData_500 = {
                status: '200',
                msg: JSON.parse(sres.text),
            }
            res.send(errorData_500);
        });
});


app.listen(3008, function () {
    console.log('app is listening at port 3008');
});
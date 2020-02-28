

var express = require('express');
var cheerio = require('cheerio');
var request = require('request');
var superagent = require('superagent');
const cookieParser = require("cookie-parser");
//除法函数，用来得到精确的除法结果
//说明：javascript的除法结果会有误差，在两个浮点数相除的时候会比较明显。这个函数返回较为精确的除法结果。
//调用：accDiv(arg1,arg2)
//返回值：arg1除以arg2的精确结果
function accDiv(arg1, arg2) {
    var t1 = 0, t2 = 0, r1, r2;
    try { t1 = arg1.toString().split(".")[1].length } catch (e) { }
    try { t2 = arg2.toString().split(".")[1].length } catch (e) { }
    with (Math) {
        r1 = Number(arg1.toString().replace(".", ""))
        r2 = Number(arg2.toString().replace(".", ""))
        return (r1 / r2) * pow(10, t2 - t1);
    }
}
//加法函数，用来得到精确的加法结果
//说明：javascript的加法结果会有误差，在两个浮点数相加的时候会比较明显。这个函数返回较为精确的加法结果。
//调用：accAdd(arg1,arg2)
//返回值：arg1加上arg2的精确结果
function accAdd(arg1, arg2) {
    var r1, r2, m;
    try { r1 = arg1.toString().split(".")[1].length } catch (e) { r1 = 0 }
    try { r2 = arg2.toString().split(".")[1].length } catch (e) { r2 = 0 }
    m = Math.pow(10, Math.max(r1, r2))
    return (arg1 * m + arg2 * m) / m
}
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
            let resData = JSON.parse(sres.text);
            let { contractProductInfos, balanceList, contractAcctInfos, cdkeyContractAcctInfos, rebateGoodsAcctInfos,
                rebateGoodsBalanceList, rebateMoneyWaters } = resData.info;
            let rule = [], rebateGoodsRule = [];
            let arr = [];
            let balanceArr = [];
            // ===========================账户资源=======================
            contractProductInfos.map((item) => {
                // 组合需要匹配的数据
                let FJifenProductList = item.contractProduct.FJifenOfferID + ',' + item.contractProduct.FJifenProductID;
                // 除的价格
                let price = JSON.parse(item.contractProduct.FGradientPrices);
                price.map((priceitem) => {
                    priceitem.FJifenProductList = FJifenProductList;
                    priceitem.FName = item.jifenProduct.FName;
                    priceitem.FRebatePrice = item.contractProduct.FRebatePrice;
                })
                // 规则
                rule.push(price);
            });

            // 组合banlance数据
            balanceList.map((banlitem) => {
                // 普通数据
                contractAcctInfos.map((item) => {
                    if (banlitem.contract_acct_id === item.FContractAcctID) {
                        banlitem.FJifenProductList = item.FJifenProductList;
                        banlitem.FGradient = item.FGradient;
                    }
                })
                // cdk数据
                cdkeyContractAcctInfos.map((item) => {
                    if (banlitem.contract_acct_id === item.FContractAcctID) {
                        banlitem.FJifenProductListCDK = item.FJifenProductList;
                        banlitem.FGradientCDK = item.FGradient;
                    }
                })
            });

            rule.map((item) => {
                item.map((innerItem, index) => {
                    balanceList.map((banlitem) => {
                        // 计算返回结果普通数据
                        if (innerItem.FJifenProductList === banlitem.FJifenProductList && index === banlitem.FGradient) {
                            innerItem.balance = banlitem.balance;
                            innerItem.all_in = banlitem.all_in;
                            // 计算所有的
                            innerItem.calcAllIn = accDiv(banlitem.all_in, innerItem.price);
                            // 计算剩余的
                            innerItem.calcBanlace = accDiv(banlitem.balance, innerItem.price);
                        }
                        // 计算返回结果CDK数据
                        if (innerItem.FJifenProductList === banlitem.FJifenProductListCDK && index === banlitem.FGradientCDK) {
                            innerItem.balanceCDK = banlitem.balance;
                            innerItem.all_inCDK = banlitem.all_in;
                            // 计算所有的
                            innerItem.calcAllInCDK = accDiv(banlitem.all_in, innerItem.price);
                            // 计算剩余的
                            innerItem.calcBanlaceCDK = accDiv(banlitem.balance, innerItem.price);
                        }
                    });

                });
            });
            let nowAllArr = [];
            // 重新组合输出数据
            rule.map((item) => {
                let calcAddAllIn = 0, calcAddBanlace = 0, FName = '', calcAddAllInCDK = 0, calcAddBanlaceCDK = 0;
                item.map((innerItem) => {
                    calcAddAllIn += innerItem.calcAllIn;
                    calcAddBanlace += innerItem.calcBanlace;
                    FName = innerItem.FName;
                    innerItem.calcAllInCDK && (calcAddAllInCDK += innerItem.calcAllInCDK);
                    innerItem.calcBanlaceCDK && (calcAddBanlaceCDK += innerItem.calcBanlaceCDK);
                });
                nowAllArr.push({ calcAddAllIn, calcAddBanlace, FName, calcAddBanlaceCDK, calcAddAllInCDK });
            });


            // ===========================赠送账户===========================
            let rebateGoodsBalanceArr = [];
            rebateGoodsBalanceList.map((banlitem) => {
                rebateGoodsAcctInfos.map((item) => {
                    if (banlitem.contract_acct_id === item.FContractAcctID) {
                        rebateGoodsBalanceArr.push({
                            contract_acct_id: banlitem.contract_acct_id,
                            balance: banlitem.balance,
                            all_in: banlitem.all_in,
                            FJifenProductListRebase: item.FJifenProductList,
                        });

                    }
                })
            });
            rule.map((item) => {
                item.map((nowItem) => {
                    rebateGoodsBalanceArr.map((innerItem) => {
                        // 计算返回结果
                        if (innerItem.FJifenProductListRebase === nowItem.FJifenProductList) {
                            // 计算所有的
                            innerItem.FRebatePrice = nowItem.FRebatePrice;
                            // 计算所有的
                            innerItem.calcAllIn = accDiv(innerItem.all_in, nowItem.FRebatePrice);
                            // 计算所有的
                            innerItem.FName = `返货（${nowItem.FName}）`;
                            // 计算剩余的
                            innerItem.calcBanlace = accDiv(innerItem.balance, nowItem.FRebatePrice);
                        }
                    })
                });

            });

            let rebateAarr = [], calcUse = 0, calcBanlace = 0;

            // =====================代理服务费=====================
            rebateMoneyWaters.map((item) => {
                // 消耗
                if (item.FStatus === 2) {
                    calcUse = accAdd(calcUse, item.FRebatePrice);
                }
                // 剩余
                else if (item.FStatus === 1) {
                    calcBanlace = accAdd(calcBanlace, item.FRebatePrice);
                }
            });
            // 总数等于消耗加剩余
            let calcAllIn = accAdd(calcUse, calcBanlace)
            if (rebateMoneyWaters.length) {
                rebateGoodsBalanceArr.unshift({
                    FName: '代理服务费（抵扣货款）',
                    calcAllIn: accDiv(calcAllIn, 100),
                    calcUse: accDiv(calcUse, 100),
                    calcBanlace: accDiv(calcBanlace, 100)
                });
            }
            let obj = { contractAcctInfos: nowAllArr, rebateGoodsBalanceArr };
            // res.send(sres.text);
            var errorData_500 = {
                status: '200',
                msg: obj,
            }
            res.send(errorData_500);
        });
});


app.listen(3008, function () {
    console.log('app is listening at port 3008');
});
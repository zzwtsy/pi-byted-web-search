本文档为 豆包搜索 Custom版（原名 联网搜索 / 融合信息搜）中返回的火山如意结构化数据，Global版不包含此文档内容。

&nbsp;

<span id="oXoO6iy1"></span>

## **WeatherCard\-天气卡片数据**

query示例：北京今日天气、北京未来7日天气、北京未来24小时天气、北京今天是否下雨

|字段名 |类型 |必须 |说明 |
|---|---|---|---|
|CardType |String |是 |天气卡片取值"weather" |
|WeatherCard |Object |否 |当CardType="weather"时有值 |
|Aqi |Object |否 |当前空气质量，示例与说明：<br><br>```JSON```<br>```{```<br>```"Aqi": 63,//空气质量指数值```<br>```"CityName": "西宁市",//城市名称```<br>```"Co": "11.0",//一氧化碳浓度(mg/m3)```<br>```"CoAqi": 11,//一氧化碳空气质量分指数值```<br>```"No2": "17.0",//二氧化氮浓度(μg/m3)```<br>```"No2Aqi": 17,//二氧化氮空气质量分指数值```<br>```"O3": "25.0",//臭氧浓度(μg/m3)```<br>```"O3Aqi": 25,//臭氧空气质量分指数值```<br>```"Pm10": "60.0",//PM10 浓度(μg/m3)```<br>```"Pm10Aqi": 60,//PM10 空气质量分指数值```<br>```"Pm25": "63.0",//PM25 浓度(μg/m3)```<br>```"Pm25Aqi": 63,//PM25 空气质量分指数值```<br>```"PrimaryPollutant": "PM2.5",//主污染物```<br>```"PubTime": "2025-11-21 14:00:00",//发布时间戳```<br>```"QualityLevel": "良",//空气质量水平```<br>```"So2": "9.0"//二氧化硫浓度(μg/m3)```<br>```}```<br><br><br> |
|AqiForecast |Array |否 |未来空气质量，示例与说明：<br><br>```JSON```<br>```[```<br>```{```<br>```"Aqi": 54,//空气质量指数值```<br>```"Date": "2025-11-20",```<br>```"ForecastTime": "2025-11-20",//预报日期```<br>```"PredictTime": "2025-11-20",```<br>```"PubTime": "2025-11-20 00:00:00",//发布时间```<br>```"PublishTime": "2025-11-20 00:00:00",```<br>```"QualityLevel": "良",//空气质量水平```<br>```"Value": "54"```<br>```},```<br>```...```<br>```]```<br><br><br> |
|Condition |Object |否 |当前天气情况，示例与说明：<br><br>```JSON```<br>```{```<br>```"Comfort": 39,```<br>```"Condition": "晴",//天气现象```<br>```"ConditionId": "5",//天气现象id```<br>```"Dewpoint": -13,//露点温度-摄氏度（℃）```<br>```"Humidity": 24,//相对湿度（%）```<br>```"Mslp": 765,//气压-百帕（hPa）```<br>```"ObsTime": "2025-11-21 14:55:08",//数据更新时间```<br>```"Precip1h": 0,//过去一小时累计降水量（mm/h）```<br>```"RealFeelNum": 2,//体感温度```<br>```"Sunrise": "2025-11-21 07:57:00",//日出时间```<br>```"Sundown": "2025-11-21 18:01:00",//日落时间```<br>```"Temp": 4,//温度-摄氏度（℃）```<br>```"Uvi": 4,//紫外线指数```<br>```"Vis": 25700,//能见度```<br>```"WindDegrees": "180",//风向角度```<br>```"WindDir": "南风",//风向```<br>```"WindLevel": "1",//风力等级```<br>```"Wspd": 0.69//风速```<br>```}```<br><br><br> |
|SevenForecastData |Array |否 |未来7日天气情况，示例与说明：<br><br>```JSON```<br>```[```<br>```{```<br>```"Humidity": 36,//相对湿度（%）```<br>```"MoonDown": "2025-11-21 18:16:00",//月落时间```<br>```"MoonPhase": "WaxingCrescent",//月升时间```<br>```"MoonRise": "2025-11-21 08:58:00",```<br>```"Mslp": 1022,//气压-百帕（hPa）```<br>```"Pop": 0,//降水概率```<br>```"PredictDate": "2025-11-21",//预报日期```<br>```"Qpf": 0,//预测对应天的日累计降水量```<br>```"SunDown": "2025-11-21 18:01:00",//日落时间```<br>```"SunRise": "2025-11-21 07:57:00",//日出时间```<br>```"TempHigh": 6,//当天最高温（℃）```<br>```"TempLow": -8,//当天最低温（℃）```<br>```"UpdateTime": "2025-11-21 13:00:00",//数据更新时间```<br>```"Uvi": 3,//紫外线指数```<br>```"WeatherDay": "晴",//白天天气现象```<br>```"WeatherIdDay": 1,//白天天气现象id```<br>```"WeatherIdNight": 1,//夜晚天气现象id```<br>```"WeatherNight": "晴",//夜晚天气现象```<br>```"WindDegreesDay": 0,//白天风向角度```<br>```"WindDegreesNight": 0,//夜晚风向角度```<br>```"WindDirDay": "北风",//白天风向```<br>```"WindDirIdDay": 1,//白天风向id```<br>```"WindDirIdNight": 1,//夜晚风向id```<br>```"WindDirNight": "北风",//夜晚风向```<br>```"WindLevelDay": "1",//白天平均风力等级```<br>```"WindLevelNight": "1"//夜晚平均风力等级```<br>```},```<br>```...```<br>```]```<br><br><br> |
|City |Object |否 |城市天气，示例与说明<br><br>```JSON```<br>```{```<br>```"CityId": "2440",```<br>```"CountryCode": "CN",//国家 code```<br>```"CountryEnName": "China",//国家英文名称```<br>```"CountryName": "中国",//多语言国家名称```<br>```"EnName": "Xining",//城市英文名称```<br>```"IanaTimezone": "Asia/Shanghai",```<br>```"Id": 2440,//城市id```<br>```"Latitude": 36.6212465,//纬度```<br>```"Longtitude": 101.7779873,//经度```<br>```"Name": "西宁市",//多语言城市名称```<br>```"ParentEnNames": "Qinghai",//上级城市英文名称```<br>```"ParentNames": "青海省",//上级城市多语言名称```<br>```"RegionEnName": "Asia",//英文区域名称```<br>```"RegionName": "亚洲",//多语言区域名称```<br>```"SecondaryName": "青海省",```<br>```"TimeZone": 8,//时区```<br>```"TimeZoneName": "Asia/Shanghai"//time_zone_name```<br>```}```<br><br><br> |
|LiveIndex |Object |否 |生活指数，示例与说明<br><br>> 生活指数类型：5\-交通指数，7\-化妆指数，12\-感冒指数，14\-旅游指数，17\-洗车指数，18\-空气污染扩散指数，19\-空调开启指数，20\-穿衣指数，21\-紫外线指数，25\-路况指数，26\-运动指数，28\-钓鱼指数，30\-雨伞指数，32\-息斯敏过敏指数<br><br><br>```JSON```<br>```{```<br>```"IndexDesc": "天气较好，路面干燥，交通气象条件良好，车辆可以正常行驶。",//生活指数文案描述```<br>```"IndexLevel": 1,//指数等级数字```<br>```"IndexLevelDesc": "良好",//指数等级描述```<br>```"IndexType": "交通指数",```<br>```"IndexTypeID": 5,//指数类型 id```<br>```"PredictDate": "2025-11-21",//预报时间```<br>```"UpdateTime": "2025-11-21 11:22:03"//更新时间```<br>```}```<br><br><br> |
|Hourly |Array |否 |未来24小时分时天气，示例与说明<br><br>```JSON```<br>```[```<br>```{```<br>```"Dewpoint": -13,//露点温度-摄氏度（℃）```<br>```"Humidity": 26,//相对湿度（%）```<br>```"Mslp": 766,//气压-百帕（hPa）```<br>```"Pop": 0,//降水概率```<br>```"PredictDate": "2025-11-21",//预报日期```<br>```"PredictHour": 14,//预报小时```<br>```"PredictTime": "2025-11-21 14:00:00",//预报时间```<br>```"Qpf": 0,//预测小时的小时累积降水量```<br>```"RealFeel": "0.0",//体感温度```<br>```"Sky": 60,//云覆盖率(%)```<br>```"Snow": "0.0",```<br>```"Temp": 4,//温度-摄氏度（℃）```<br>```"UpdateTime": "2025-11-21 14:23:09",//更新时间```<br>```"Uvi": 4,//紫外线指数```<br>```"Weather": "晴",//天气现象```<br>```"WeatherId": 5,//天气现象id```<br>```"WindDegrees": "90",//风向角度```<br>```"WindDir": "东风",//风向```<br>```"WindDirId": 5,//风向id```<br>```"WindLevel": 3,//风力等级```<br>```"WindSpeed": "3.81"//风速```<br>```},```<br>```...```<br>```]```<br><br><br> |
|LiveWeatherData |Object |否 |极端天气预警，示例与说明<br><br>```JSON```<br>```"alerts": [```<br>```{```<br>```"alert_level": "橙色",//预警等级```<br>```"alert_name": "暴雨",//预警类型```<br>```"content": "市气象台2025年08月26日16时00分继续发布暴雨橙色预警信号，预计26日夜间至27日夜间，我市部分地区将出现6小时100毫米以上或者24小时150毫米以上的强降水，房山、门头沟、昌平、怀柔等区的个别地方累计降雨量可达200毫米以上，山区及浅山区出现山洪、泥石流、滑坡等灾害的风险极高，低洼地区极易出现积水，请注意防范。（预警信息来源：国家预警信息发布中心）",//预警内容```<br>```"pub_time": "2025-08-26 16:30:19",//预警发布时间```<br>```"title": "北京市气象台升级发布暴雨橙色预警信号"//预警标题```<br>```}```<br>```]```<br><br><br> |

<span id="CsY1JN6M"></span>

##

<span id="l8i16Wsk"></span>

## **LotteryCard\-彩票卡片数据**

query示例：双色球开奖、彩票开奖

|字段名 ||类型 |字段说明 |样例值 |
|---|---|---|---|---|
|CardType | |String |彩票卡片取值“lottery” | |
|LotteryCard | |Object |当CardType="lottery"时有值 | |
|Jackpot | |String |奖池 |2723830474 |
|Lottery_Name | |String |彩票名称 |双色球 |
|Lottery_Time | |String |开奖时间 |每二/四/日开奖 |
|Result<br><br> |Ball |Array |开奖号码 |红球：03;05;09;13;26;29；蓝球：12 |
||Issue |String |彩票期数 |25134 |
||Issue_date |String |当期彩票开奖日期 |2025\-11\-20 21:15（周四） |

示例

```JSON
"LotteryCard":{
    "LotteryInfoList": [
        {
            "Jackpot": "2723830474",
            "LotteryName": "双色球",
            "LotteryTime": "每二/四/日开奖",
            "Result": {
                "Ball": [
                    {
                        "Num": "03;05;09;13;26;29",
                        "Type": "红球"
                    },
                    {
                        "Num": "12",
                        "Type": "蓝球"
                    }
                ],
                "Issue": "25134",
                "IssueDate": "2025-11-20 21:15（周四）"
            }
        },
       ...
    ]
}
```

<span id="ylk2wri2"></span>

##

<span id="XWa7LiaP"></span>

## **MetalCard\-贵金属卡片数据**

query示例：黄金价格、今日白银

|字段名 ||类型 |字段说明 |样例值 |
|---|---|---|---|---|
|CardType | |String |贵金属卡片取值“metal” | |
|MetalCard | |Object |当CardType="metal"时有值 | |
|MetalName | |Array |贵金属类型 |黄金T+D |
|Data |Day |String |日期 |11\-21 |
||Price |String |价格 |922.79 |
||Ratio |String |变化幅度 |\-1.03% |
||RatioData |String |变化价格 |\-9.61 |
||Time |String |更新时间 |14:44 |
||Unit |String |单位 |元/克 |
||UpDown |String |变化趋势 |down |

示例

```JSON
   "MetalCard": {
    "MetalInfoList": [
        {
            "MetalName": "黄金T+D",
            "Data": {
                "Day": "11-21",
                "Price": "922.79",
                "Ratio": "-1.03%",
                "RatioData": "-9.61",
                "Time": "14:44",
                "Unit": "元/克",
                "UpDown": "down"
            }
        },
       ...
    ]
}
```

<span id="0BAVFxZJ"></span>

##

<span id="wa1W16jS"></span>

## **ExchangeRateCard\-汇率卡片数据**

query示例：人民币兑换日币

|字段名 ||类型 |字段说明 |样例值 |
|---|---|---|---|---|
|CardType | |String |汇率卡片取值“exchange_rate” | |
|ExchangeRateCard | |Object |当CardType="exchange_rate"时有值 | |
|Title | |String |汇率名称 |人民币兑换日元 |
|FromCountry | |String |原货币 |中国 |
|FromKeyUrl | |String |货币代码 |CNY |
|ToCountry | |String |目标货币 |日本 |
|ToKeyUrl | |String |目标货币代码 |JPY |
|Data |InverseRate |String |汇率 |22.0882000000 |
||Rate |String |汇率倒数比 |0.0452730417 |
||UpdateTime |String |更新时间 |2025\-11\-21 14:25:35 |

示例

```JSON
"ExchangeRateCard":{
    "FromCountry": "中国",
    "FromKeyUrl": "CNY",
    "Data": {
        "InverseRate": "0.0452730417",
        "Rate": "22.0882000000",
        "UpdateTime": "2025-11-21 14:25:35"
    },
    "Title": "人民币兑换日元",
    "ToCountry": "日本",
    "ToKeyUrl": "JPY"
}
```

<span id="7cGEVHmT"></span>

##

<span id="2XtH8GPn"></span>

## **HolidayCard\-节假日卡片数据**

query示例：2026年放假安排、2026年国庆节放假与调休

|字段名 |类型 |字段说明 |样例值 |
|---|---|---|---|
|CardType |String |节假日卡片取值“holiday_plan” | |
|HolidayCard |Object |当CardType="holiday_plan"时有值 | |
|HolidayName |String |节日名称 |元旦 |
|ActualDate |String |节日日期 |2026\-01\-01 |
|HolidayStartDate |String |放假开始时间 |01月01日 |
|HolidayEndDate |String |放假结束时间 |01月03日 |
|Days |String |放假天数 |3 |
|WorkAdjustment |String |调休信息 |1月4日（周日）上班 |

示例

```JSON
"HolidayCard": {
    "HolidayInfoList": [
        {
            "HolidayName": "元旦",
            "ActualDate": "2026-01-01",
            "HolidayStartDate": "01月01日",
            "HolidayEndDate": "01月03日",
            "Days": "3",
            "WorkAdjustment": "1月4日（周日）上班"
        },
       ...
    ]
}
```

&nbsp;

&nbsp;

<span id="vcL5ikQU"></span>

## HanziCard **\-汉字卡片数据**

query示例：穹、穹字怎么写、穹字怎么读

|字段名 ||类型 |字段说明 |样例值 |
|---|---|---|---|---|
|CardType | |String |汉字卡片取值“hanzi_detail” | |
|HanziCard | |Object |当CardType="hanzi_detail"时有值 | |
|Title | |String |汉字 |穹 |
|Radical | |String |部首 |穴 |
|Structure | |String |结构 |上下 |
|Wubi | |String |五笔 |pwx |
|Stroke | |String |笔顺 |丶、丶、乛、ノ、丶、ㄱ、一、㇉ |
|StrokeNum | |String |笔画数 |8 |
|Fanti | |String |繁体 |穹 |
|Wuxing | |String |五行 |木 |
|Spell | |String |拼音 |qióng |
|Opinions |BasicOpinion |String |释义 |中间高起、四边下垂的样子；成拱形的。 |
||Zuci |String |组词 |穹顶、穹隆、穹庐 |

示例

```JSON
"HanziCard": {
    "Title": "穹",
    "Radical": "穴",
    "Structure": "上下",
    "Wubi": "pwxb",
    "Stroke": "丶、丶、乛、ノ、丶、ㄱ、一、㇉",
    "StrokeNum": "8",
    "Fanti": "穹",
    "Wuxing": "木",
    "Spell": "qióng",
    "Opinions": [
        {
            "BasicOpinion": "中间高起、四边下垂的样子；成拱形的。",
            "Zuci": "穹顶、穹隆、穹庐"
        },
        {
            "BasicOpinion": "天空。",
            "Zuci": "苍穹"
        }
    ]
}
```

<span id="LYEpNrLa"></span>

##

<span id="YPAMusow"></span>

## TrainScheduleCard **\-火车车次详情卡片数据**

query示例：G973、G973次火车

|字段名 ||类型 |字段说明 |样例值 |
|---|---|---|---|---|
|CardType | |String |火车车次卡片取值“train_schedule” | |
|TrainScheduleCard | |Object |当CardType="train_schedule"时有值 | |
|TrainCode | |String |列车代码 |G973 |
|HeadStationName | |String |始发站名称 |北京朝阳 |
|TailStationName | |String |终点站名称 |大连北 |
|StopStations |StationNo |String |站点序号 |1 |
||StationName |String |站点名称 |北京朝阳 |
||ArrTime |String |到达时间 |\-\-\-\- |
||DepTime |String |出发时间 |08:10 |
||ArriveDays |String |到达天数 |0 |
||StopoverTime |String |停留时间 |\-\-\-\- |

示例

```JSON
"TrainScheduleCard":{
    "TrainCode": "G973",
    "HeadStationName": "北京朝阳",
    "TailStationName": "大连北",
    "StopStations": [
        {
            "StationNo": "1",
            "StationName": "北京朝阳",
            "ArrTime": "----",
            "DepTime": "08:10",
            "ArriveDays": "0",
            "StopoverTime": "----"
        },
        {
            "StationNo": "2",
            "StationName": "辽宁朝阳",
            "ArrTime": "09:40",
            "DepTime": "09:44",
            "ArriveDays": "0",
            "StopoverTime": "4分钟"
        },
        ...
    ]
}
```

&nbsp;

&nbsp;

<span id="Q87Vo2Gb"></span>

## TrainRouteCard **\-两地火车卡片数据**

query示例：德州市到天津市的火车

|字段名 |||类型 |字段说明 |样例值 |
|---|---|---|---|---|---|
|CardType | | |String |两地火车卡片取值“train_route” | |
|TrainRouteCard | | |Object |当CardType="train_route"时有值 | |
|DepName | | |String |出发城市名称 |德州 |
|ArrName | | |String |到达城市名称 |天津 |
|TrainList |TrainCode | |String |车次代码 |Z366 |
||TrainType | |String |车次类型 |直达特快 |
||DepStationName | |String |出发站点名称 |德州 |
||ArrStationName | |String |到达站点名称 |天津 |
||DepDate | |String |出发日期 |2026\-01\-22 |
||ArrDate | |String |到达日期 |2026\-01\-22 |
||DepTime | |String |出发时间 |00:19 |
||ArrTime | |String |到达时间 |02:30 |
||RunTime | |String |运行时间（分钟） |131 |
||TicketList |TicketType |String |车票类型 |软卧 |
|||TicketPrice |String |车票价格 |125.5 |

示例

```JSON
"TrainRouteCard": {
    "DepName": "德州",
    "ArrName": "天津",
    "TrainList": [
        {
            "TrainCode": "Z366",
            "TrainType": "直达特快",
            "DepStationName": "德州",
            "ArrStationName": "天津",
            "DepDate": "2026-01-22",
            "ArrDate": "2026-01-22",
            "DepTime": "00:19",
            "ArrTime": "02:30",
            "RunTime": "131",
            "TicketList": [
                {
                    "TicketType": "软卧",
                    "TicketPrice": "125.5"
                },
                {
                    "TicketType": "硬卧",
                    "TicketPrice": "83.5"
                },
                {
                    "TicketType": "硬座",
                    "TicketPrice": "37.5"
                },
                {
                    "TicketType": "无座",
                    "TicketPrice": "37.5"
                }
            ]
        },
        ...
    ]
}
```

&nbsp;

&nbsp;

<span id="jUE0rmaX"></span>

## FlightRouteCard **\-两地航班卡片数据**

query示例：北京到长沙的航班

|字段名 ||||类型 |字段说明 |样例值 |
|---|---|---|---|---|---|---|
|CardType | | | |String |两地航班卡片取值“flight_route” | |
|FlightRouteCard | | | |Object |当CardType="flight_route"时有值 | |
|DepName | | | |String |出发城市名称 |北京 |
|ArrName | | | |String |到达城市名称 |长沙 |
|FlightList |Price |SaleTotalPrice | |String |票价 |798 |
|||PriceType | |String |价格类型 |3.8折经济舱 |
||Segments |FlightNo | |String |航班号 |CA1343 |
|||AirlineName | |String |航空公司名称 |中国国际航空 |
|||DepAirportName | |String |出发机场名称 |北京首都国际机场 |
|||DepAirportTerminal | |String |出发机场航站楼 |T3 |
|||ArrAirportName | |String |到达机场名称 |长沙黄花国际机场 |
|||ArrAirportTerminal | |String |到达机场航站楼 |T1 |
|||DepDate | |String |出发日期 |2026\-01\-22 |
|||ArrDate | |String |到达日期 |2026\-01\-22 |
|||DepTime | |String |出发时间 |06:40 |
|||ArrTime | |String |到达时间 |09:25 |
|||RunTime | |String |飞行时间（分钟） |165 |
|||Aircraft |AircraftName |String |飞机信息 |空客321 |
||||OperateFlight |String |共享航班信息 |中型飞机 |

示例

```JSON
 "FlightRouteCard":{
    "DepName": "北京",
    "ArrName": "长沙",
    "FlightList": [
        {
            "Prices": [
                {
                    "SaleTotalPrice": "798",
                    "PriceType": "3.8折经济舱"
                },
                {
                    "SaleTotalPrice": "1490",
                    "PriceType": "2.4折公务舱"
                }
            ],
            "Segments": [
                {
                    "FlightNo": "CA1343",
                    "AirlineName": "中国国际航空",
                    "DepAirportName": "北京首都国际机场",
                    "DepAirportTerminal": "T3",
                    "ArrAirportName": "长沙黄花国际机场",
                    "ArrAirportTerminal": "T1",
                    "DepDate": "2026-01-22",
                    "ArrDate": "2026-01-22",
                    "DepTime": "06:40",
                    "ArrTime": "09:25",
                    "RunTime": "165",
                    "Aircraft": {
                        "AircraftName": "空客321",
                        "AircraftType": "中型飞机"
                    }
                }
            ]
        },
        ...
    ]
}
```

&nbsp;

&nbsp;

<span id="tw0tkOJA"></span>

## SportsMatchCard **\-篮球足球赛事卡片数据**

query示例：NBA近期比赛

|字段名 ||||类型 |字段说明 |样例值 |
|---|---|---|---|---|---|---|
|CardType | | | |String |篮球足球赛事卡片取值“sports_match” | |
|SportsMatchCard | | | |Object |当CardType="sports_match"时有值 | |
|MoreMatchUrl | | | |String |更多比赛信息 |[https://ic.snssdk.com/gf/sport/homepage/?tab=Schedule\u0026league_id=9999\u0026enter_from=\u0026season=2025\u0026hide_status_bar=1\u0026hide_growth_bar=1\u0026from_page=search\u0026sport_league_id=9999](https://ic.snssdk.com/gf/sport/homepage/?tab=Schedule\u0026league_id=9999\u0026enter_from=\u0026season=2025\u0026hide_status_bar=1\u0026hide_growth_bar=1\u0026from_page=search\u0026sport_league_id=9999) |
|RecentMatch |SchemaWeb | | |String |最近的赛事积分球队展示页 |[https://ic.snssdk.com/gf/sport/live/room?live_id=7540275238458622217\u0026enter_from=search\u0026hide_growth_bar=1](https://ic.snssdk.com/gf/sport/live/room?live_id=7540275238458622217\u0026enter_from=search\u0026hide_growth_bar=1) |
||MatchTime | | |String |比赛时间 |2025\-11\-11 08:00:00 |
||ShortMatchName | | |String |比赛缩写 |NBA |
||RoundName | | |String |赛程阶段 |常规赛 |
||GuestTeam |Name | |String |客队名称 |奇才 |
|||Score | |String |得分 |135 |
|||Portrait | |String |形象 |[https://p6-tt-sports-sign.byteimg.com/ies-fe-mis2/642e2c32f2e6853b8cdced96a8e39174.png~tplv-tt-cs0:0:0.png?_iz=32620\u0026from=tt_sports\u0026lk3s=d481d984\u0026x-expires=1778906027\u0026x-signature=voAAbHzeZbLBcon8hB6NXbhPE%2BU%3D](https://p6-tt-sports-sign.byteimg.com/ies-fe-mis2/642e2c32f2e6853b8cdced96a8e39174.png~tplv-tt-cs0:0:0.png?_iz=32620\u0026from=tt_sports\u0026lk3s=d481d984\u0026x-expires=1778906027\u0026x-signature=voAAbHzeZbLBcon8hB6NXbhPE%2BU%3D) |
||HostTeam |Name | |String |主对名称 |活塞 |
|||Score | |String |得分 |137 |
|||Portrait | |String |形象 |[https://p3-tt-sports-sign.byteimg.com/ies-fe-mis2/5e3a4373bf05d16fb74c732f47204019.png~tplv-tt-cs0:0:0.png?_iz=32620\u0026from=tt_sports\u0026lk3s=d481d984\u0026x-expires=1778906027\u0026x-signature=8u%2FeyzyjSkWgz2C5lHiSURYaR94%3D](https://p3-tt-sports-sign.byteimg.com/ies-fe-mis2/5e3a4373bf05d16fb74c732f47204019.png~tplv-tt-cs0:0:0.png?_iz=32620\u0026from=tt_sports\u0026lk3s=d481d984\u0026x-expires=1778906027\u0026x-signature=8u%2FeyzyjSkWgz2C5lHiSURYaR94%3D) |
||ScoreDetails |GuestScoreList |Points |String |客队得分 |37 |
||||Sequence |String |排序 |1 |
||||Title |String |名称 |第一节 |
|||HostScoreList |Points |String |主队得分 |36 |
||||Sequence |String |排序 |1 |
||||Title |String |名称 |第一节 |

示例

```JSON
"SportsMatchCard":{
    "MoreMatchUrl": "https://ic.snssdk.com/gf/sport/homepage/?tab=Schedule\u0026league_id=9999\u0026enter_from=\u0026season=2025\u0026hide_status_bar=1\u0026hide_growth_bar=1\u0026from_page=search\u0026sport_league_id=9999",
    "RecentMatch": [
        {
            "SchemaWeb": "https://ic.snssdk.com/gf/sport/live/room?live_id=7540275238458622217\u0026enter_from=search\u0026hide_growth_bar=1",
            "MatchTime": "2025-11-11 08:00:00",
            "GuestTeam": {
                "Name": "奇才",
                "Score": 135,
                "Portrait": "https://p6-tt-sports-sign.byteimg.com/ies-fe-mis2/642e2c32f2e6853b8cdced96a8e39174.png~tplv-tt-cs0:0:0.png?_iz=32620\u0026from=tt_sports\u0026lk3s=d481d984\u0026x-expires=1778906027\u0026x-signature=voAAbHzeZbLBcon8hB6NXbhPE%2BU%3D"
            },
            "HostTeam": {
                "Name": "活塞",
                "Score": 137,
                "Portrait": "https://p3-tt-sports-sign.byteimg.com/ies-fe-mis2/5e3a4373bf05d16fb74c732f47204019.png~tplv-tt-cs0:0:0.png?_iz=32620\u0026from=tt_sports\u0026lk3s=d481d984\u0026x-expires=1778906027\u0026x-signature=8u%2FeyzyjSkWgz2C5lHiSURYaR94%3D"
            },
            "ShortMatchName": "NBA",
            "RoundName": "常规赛",
            "ScoreDetails": {
                "GuestScoreList": [
                    {
                        "Points": "37",
                        "Sequence": 1,
                        "Title": "第一节"
                    },
                    ...
                ],
                "HostScoreList": [
                    {
                        "Points": "36",
                        "Sequence": 1,
                        "Title": "第一节"
                    },
                    ...
                ]
            }
        },
        ...
    ]
}
```

&nbsp;

&nbsp;

<span id="NtJ7tNnp"></span>

## ActorWorksCard **\-明星作品/作品演员表**

query示例：赵丽颖代表作

|字段名 ||类型 |字段说明 |样例值 |
|---|---|---|---|---|
|CardType | |String |明星作品/作品演员表卡片取值“actor_album” | |
|ActorWorksCard | |Object |当CardType="actor_album"时有值 | |
|ActorName | |String |明星名字 | |
|NameAlias | |String |别名 | |
|TvWorks |Name |String |作品名称 |小城大事 |
||TypeName |String |作品类型 |电视剧 |
||Directors |String |导演 |孙皓 |
||Actors |String |演员列表 |"赵丽颖","黄晓明", "陈明昊", "朱媛媛", "秦俊杰", "耿乐", "余皑磊","张国强","刘威葳","李九霄", "张维伊", "王伊瑶" |
||ReleaseAreas |String |发行地区 |中国大陆 |
||ReleaseTimeStr |String |发行时间 |2026\-01\-10 |
||Episodes |String |集数 |40 |
||Duration |String |单集时长（分钟） |45 |
||Desc |String |作品描述<br><br> |20世纪80年代初，改革开放的春风吹到东江省。为了加快发展，平川县决定设立“月海镇”。李秋萍与郑德诚两名能力及个性突出的干部，秉着“人民城市人民建”的理念，借助改革开放政策和中央一号文件找到了改革的办法，带领众人在滩涂之上建起一座现代化的城市。这是一段从无到有的造城奇迹，更是中国建城史上的一次壮举，几十万人民的命运因此得以改变。李秋萍、郑德诚、解春来、高雪梅等造城者敢想敢干、敢为人先，在阳光灿烂的80年代谱写了华丽的篇章。 |
||RoleName |String |角色名称 |李秋萍 |
||PosterThumb |String |剧照 | |
|MovieWorks<br><br> |Name |String |作品名称 |酱园弄·悬案 |
||TypeName |String |作品类型 |电影 |
||Directors |String |导演 |陈可辛 |
||Actors |String |演员列表 | "章子怡", "王传君", "易烊千玺", "赵丽颖", "雷佳音","杨幂","大鹏","李现", "梅婷", "刘润萱","章宇", "康春雷" |
||ReleaseAreas |String |发行地区 |中国大陆 |
||ReleaseTimeStr |String |发行时间 |2025\-06\-21 |
||Episodes |String |集数 |1 |
||Duration |String |单集时长（分钟） |96 |
||Desc<br><br> |String |作品描述 |深夜，上海新昌路酱园弄内发生了一起骇人听闻的杀人案，平日饱受欺凌的妻子詹周氏持刀杀死多年虐待自己的丈夫詹云影，并将其分尸16块。\n此后，层出不穷的嫌犯和证人陆续揭开詹周氏苦难的人生，却使案情陷入层层迷雾。 |
||RoleName |String |角色名称 |西林 |
||PosterThumb |String |剧照 | |
|VarietyWorks<br><br> |Name |String |作品名称 |推市营业中·与凤行专场 |
||TypeName |String |作品类型 |综艺 |
||Directors |String |导演 | |
||Actors |String |嘉宾列表 | "赵丽颖", "林更新", "辛云来", "刘冠麟", "何与", "王伊瑶" |
||ReleaseAreas |String |发行地区 |中国大陆 |
||ReleaseTimeStr |String |发行时间 |2024\-04\-11 |
||Duration |String |单集时长（分钟） |72 |
||Desc |String |作品描述 |"沈璃、行止、墨方、拂容君、天君、金娘子收到仙界的任务：前往推市捉拿三年来一直在此作乱的魑魅。六人化身凡人来到推市，发现人间已到民国，他们乔装打扮，便开始了封印魑魅的特别任务……" |
||RoleName |String |角色名称 | |
||PosterThumb |String |剧照 | |
|DocumentaryWorks<br><br> |Name |String |作品名称 |布达拉宫第二季 |
||TypeName |String |作品类型 |纪录片 |
||Directors |String |导演 |王冲霄 |
||Actors |String |演员列表 | "赵丽颖", "王冲霄", "王乐","戴娆","顾辰", "周薇" |
||ReleaseAreas |String |发行地区 |中国大陆 |
||ReleaseTimeStr |String |发行时间 |2025\-02\-16 |
||Duration |String |单集时长（分钟） |52 |
||Episodes |String |集数 |7 |
||Desc |String |作品描述 |《布达拉宫》第二季是由民族宗教专家全程指导，咪咕视讯科技有限公司与天成嘉华联合出品的大型人文纪录片，于2025年2月16日起在咪咕视频全网独播。\n该系列作为首部全景式展现布达拉宫的纪录片，第二季共有7集篇章，通过对神话传说、历史文献文物、工匠精神等多维度的解读，向人们展示一个真实立体的布达拉宫。 |
||RoleName |String |角色名称 | |
||PosterThumb |String |剧照 | |

示例

```JSON
"ActorWorksCard": {
{
    "ActorName": "赵丽颖",
    "NameAlias": [
        "赵小刀",
        "丽颖",
        "颖宝",
        "小赵总",
        "丽颖姐姐",
        "Zanilia Zhao",
        "小骨"
    ],
    "MovieWorks": [
        {
            "Name": "酱园弄·悬案",
            "TypeName": "电影",
            "Directors": [
                "陈可辛"
            ],
            "Actors": [
                "章子怡",
                "王传君",
                "易烊千玺",
                "赵丽颖",
                "雷佳音",
                "杨幂",
                "大鹏",
                "李现",
                "梅婷",
                "刘润萱",
                "章宇",
                "康春雷"
            ],
            "ReleaseAreas": "中国大陆",
            "ReleaseTimeStr": "2025-06-21",
            "Episodes": 1,
            "Duration": 96,
            "Desc": "深夜，上海新昌路酱园弄内发生了一起骇人听闻的杀人案，平日饱受欺凌的妻子詹周氏持刀杀死多年虐待自己的丈夫詹云影，并将其分尸16块。 此后，层出不穷的嫌犯和证人陆续揭开詹周氏苦难的人生，却使案情陷入层层迷雾。",
            "RoleName": "西林",
            "PosterThumb": ""
        },
        ...
    ],
    "TvWorks": [
        {
            "Name": "小城大事",
            "TypeName": "电视剧",
            "Directors": [
                "孙皓"
            ],
            "Actors": [
                "赵丽颖",
                "黄晓明",
                "陈明昊",
                "朱媛媛",
                "秦俊杰",
                "耿乐",
                "余皑磊",
                "张国强",
                "刘威葳",
                "李九霄",
                "张维伊",
                "王伊瑶"
            ],
            "ReleaseAreas": "中国大陆",
            "ReleaseTimeStr": "2026-01-10",
            "Episodes": 40,
            "Duration": 45,
            "Desc": "20世纪80年代初，改革开放的春风吹到东江省。为了加快发展，平川县决定设立“月海镇”。李秋萍与郑德诚两名能力及个性突出的干部，秉着“人民城市人民建”的理念，借助改革开放政策和中央一号文件找到了改革的办法，带领众人在滩涂之上建起一座现代化的城市。这是一段从无到有的造城奇迹，更是中国建城史上的一次壮举，几十万人民的命运因此得以改变。李秋萍、郑德诚、解春来、高雪梅等造城者敢想敢干、敢为人先，在阳光灿烂的80年代谱写了华丽的篇章。",
            "RoleName": "李秋萍",
            "PosterThumb": ""
        },
        ...
    ],
    "VarietyWorks": [
        {
            "Name": "推市营业中·与凤行专场",
            "TypeName": "综艺",
            "Directors": [

            ],
            "Actors": [
                "赵丽颖",
                "林更新",
                "辛云来",
                "刘冠麟",
                "何与",
                "王伊瑶"
            ],
            "ReleaseAreas": "中国大陆",
            "ReleaseTimeStr": "2024-04-11",
            "Episodes": 1,
            "Duration": 72,
            "Desc": "沈璃、行止、墨方、拂容君、天君、金娘子收到仙界的任务：前往推市捉拿三年来一直在此作乱的魑魅。六人化身凡人来到推市，发现人间已到民国，他们乔装打扮，便开始了封印魑魅的特别任务……",
            "RoleName": "",
            "PosterThumb": ""
        },
        ...
    ],
    "DocumentaryWorks": [
        {
            "Name": "布达拉宫第二季",
            "TypeName": "纪录片",
            "Directors": [
                "王冲霄"
            ],
            "Actors": [
                "赵丽颖",
                "王冲霄",
                "王乐",
                "张爽",
                "戴娆",
                "顾辰",
                "周薇"
            ],
            "ReleaseAreas": "中国大陆",
            "ReleaseTimeStr": "2025-02-16",
            "Episodes": 7,
            "Duration": 52,
            "Desc": "《布达拉宫》第二季是由民族宗教专家全程指导，咪咕视讯科技有限公司与天成嘉华联合出品的大型人文纪录片，于2025年2月16日起在咪咕视频全网独播。 该系列作为首部全景式展现布达拉宫的纪录片，第二季共有7集篇章，通过对神话传说、历史文献文物、工匠精神等多维度的解读，向人们展示一个真实立体的布达拉宫。",
            "RoleName": "",
            "PosterThumb": ""
        },
        ...
    ]
}
```

&nbsp;

&nbsp;

<span id="YBBL0EiQ"></span>

## TaxEnquiryCard **\-个人所得税**

query示例：个人所得税税率

|字段名 ||类型 |字段说明 |样例值 |
|---|---|---|---|---|
|CardType | |String |个人所得税卡片取值“tax_enquiry” | |
|TaxEnquiryCard | |Object |当CardType="tax_enquiry"时有值 | |
|Title | |String |税率名称 |个人所得税\-年度税率表查询 |
|RateItems |Series |String |级数 |1 |
||Standard |String |标准 |不超过36000元的 |
||Ratio |String |税率 |3% |
||Deductions |String |扣除数 |0 |
|DeductionItems |special |String |扣除费用项 |子女教育 |
||fee |String |费用说明 |纳税人的子女接受全日制学历教育的相关支出，按照每个子女每月2000元的标准定额扣除。 |

示例

```JSON
 "TaxEnquiryCard": {
    "Title": "个人所得税-年度税率表查询",
    "RateItems": [
        {
            "Series": "1",
            "Standard": "不超过36000元的",
            "Ratio": "3%",
            "Deductions": "0"
        },
        {
            "Series": "2",
            "Standard": "超过36000元至144000元的部分",
            "Ratio": "10%",
            "Deductions": "2520"
        },
        ...
    ],
    "DeductionItems": [
        {
            "Special": "子女教育",
            "Fee": "纳税人的子女接受全日制学历教育的相关支出，按照每个子女每月2000元的标准定额扣除。"
        },
        ...
    ]

```

&nbsp;

&nbsp;

<span id="gpvMHREy"></span>

## MacroEconomyCard **\-各地GDP**

query示例：中山GDP

|字段名 |||类型 |字段说明 |样例值 |
|---|---|---|---|---|---|
|CardType | | |String |各地GDP卡片取值“macro_economy” | |
|MacroEconomyCard | | |Object |当CardType="macro_economy"时有值 | |
|Title | | |String |地区GDP名称 |中山GDP |
|Place | | |String |地区 |中山 |
|PlaceLevel | | |String |地区等级 |City |
|IntentType | | |String |指标类型 |GDP |
|CurrentValue | | |String |值 |0.43 |
|CurrentUnit | | |String |单位 |万亿元 |
|Sections |TabName | |String |名称 |近年GDP |
||SecondaryTabName | |String |二级名称 |年度 |
||Frequency | |String |周期 |年 |
||Unit | |String |单位 |万元/人 |
||RankType | |String |排序类型 | |
||Indicators |Name |String |指标名称 |GDP |
|||Unit |String |单位 |万亿元 |
||Items |Name |String |项目名称 |2006 |
|||Values |String |值 |&nbsp;<br><br>```JSON```<br>```{```<br>```"GDP": "0.11",```<br>```"人均GDP": "4.33"```<br>```}```<br><br><br> |

示例

```JSON
"MacroEconomyCard":{
    "Title": "中山GDP",
    "Place": "中山",
    "PlaceLevel": "City",
    "IntentType": "GDP",
    "CurrentValue": "0.43",
    "CurrentUnit": "万亿元",
    "Sections": [
        {
            "TabName": "近年GDP",
            "SecondaryTabName": "年度",
            "Frequency": "年",
            "Unit": "万元/人",
            "RankType": "",
            "Indicators": [
                {
                    "Name": "GDP",
                    "Unit": "万亿元"
                },
                {
                    "Name": "人均GDP",
                    "Unit": "万元/人"
                }
            ],
            "Items": [
                {
                    "Name": "2006",
                    "Values": {
                        "GDP": "0.11",
                        "人均GDP": "4.33"
                    }
                },
                ...
                {
                    "Name": "2025",
                    "Values": {
                        "GDP": "0.43",
                        "人均GDP": "9.4"
                    }
                }
            ]
        },
       ...
}
```

&nbsp;

&nbsp;

<span id="3z392VOL"></span>

## ZipcodeCard **\-邮政编码**

query示例：资中邮政编码

|字段名 |类型 |字段说明 |样例值 |
|---|---|---|---|
|CardType |String |邮政编码卡片取值“zipcode” | |
|ZipcodeCard |Object |当CardType="zipcode"时有值 | |
|Zipcode |String |邮编 |641200 |
|Province |String |省份 |四川省 |
|City |String |城市 |内江市 |
|District |String |地区 |资中县 |

示例

```JSON
"ZipcodeCard": {
"Zipcode": "641200",
"Province": "四川省",
"City": "内江市",
"District": "资中县",
"AreaItems": []
}
```

&nbsp;

&nbsp;

<span id="uZqIW4JD"></span>

## BasketballEventCard **\-** NBA/CBA赛程

query示例：2026年4月13日NBA比赛

|字段名 |||类型 |字段说明 |样例值 |
|---|---|---|---|---|---|
|CardType | | |String |NBA/CBA赛程卡片取值“basketball_event” | |
|BasketballEventCard | | |Object |当CardType="basketball_event"时有值 | |
|Title | | |String |卡片标题 |2026\-04\-12 至 2026\-04\-14 NBA 常规赛 |
|ShortMatchName | | |String |联赛简称（NBA 或 CBA） |NBA |
|RoundName | | |String |阶段名称（如常规赛、季后赛） |常规赛 |
|MatchCount | | |String |返回的比赛数 |15 |
|Matches |MatchTime | |String |比赛开始时间，北京时间，格式 YYYY\-MM\-DD HH:mm:ss |2026\-04\-13 06:00:00 |
||StatusText | |String |比赛状态文案 |已完赛 |
||ShortMatchName | |String |联赛简称 |NBA |
||RoundName | |String |单场所属阶段 |常规赛 |
||HostTeam |Name |String |主队名称 |骑士 |
|||Score |String |主队总分 |130 |
|||Name |String |客队名称 |奇才 |
|||Score |String |客队总分 |117 |
|||HostScoreList  |String |主队各节得分 |43,22,34,31 |
|||GuestScoreList |String |客队各节得分 |21,34,40,22 |
||PlayerStats |Team  |String |球员所属球队 |奇才 |
|||Name  |String |球员名称 |贾米尔\-沃特金斯 |
|||Minutes |String |出场时间 |34:20 |
|||Points |String |得分 |24 |
|||Rebounds |String |篮板 |4 |
|||Assists |String |助攻 |3 |

示例

```JSON
"BasketballEventCard": {
    "Title": "2026-04-12 至 2026-04-14 NBA 常规赛",
    "ShortMatchName": "NBA",
    "RoundName": "常规赛",
    "MatchCount": 15,
    "Matches": [
        {
            "MatchTime": "2026-04-13 06:00:00",
            "StatusText": "已完赛",
            "ShortMatchName": "NBA",
            "RoundName": "常规赛",
            "HostTeam": {
                "Name": "骑士",
                "Score": 130
            },
            "GuestTeam": {
                "Name": "奇才",
                "Score": 117
            },
            "ScoreDetails": {
                "HostScoreList": [
                    43,
                    22,
                    34,
                    31
                ],
                "GuestScoreList": [
                    21,
                    34,
                    40,
                    22
                ]
            },
            "PlayerStats": [
                {
                    "Team": "奇才",
                    "Name": "贾米尔-沃特金斯",
                    "Minutes": "34:20",
                    "Points": 24,
                    "Rebounds": 4,
                    "Assists": 3
                },
                ...
                {
                    "Team": "骑士",
                    "Name": "小克雷格-波特",
                    "Minutes": "27:51",
                    "Points": 7,
                    "Rebounds": 7,
                    "Assists": 4
                }
            ]
        },
        ...
        {
            "MatchTime": "2026-04-13 08:30:00",
            "StatusText": "已完赛",
            "ShortMatchName": "NBA",
            "RoundName": "常规赛",
            "HostTeam": {
                "Name": "马刺",
                "Score": 118
            },
            "GuestTeam": {
                "Name": "掘金",
                "Score": 128
            }
        }
    ]
}
```

&nbsp;

&nbsp;

<span id="75rmTuCM"></span>

## BasketballMatchCard **\-** NBA/CBA对战信息

query示例：湖人比赛、湖人爵士2026年4月13日比赛结果

|字段名 ||类型 |字段说明 |样例值 |
|---|---|---|---|---|
|CardType | |String |NBA/CBA对战信息卡片取值“basketball_match” | |
|BasketballMatchCard | |Object |当CardType="basketball_match"时有值 | |
|RecentMatches | |Array |最近比赛列表，返回近期多场比赛时有该字段 | |
|MatchTime | |String |比赛开始时间，北京时间 |2026\-04\-13 08:30:00 |
|StatusText | |String |比赛状态文案 |已完赛 |
|ShortMatchName | |String |联赛简称 |NBA |
|RoundName | |String |阶段名称 |常规赛 |
|HostTeam |Name |String |主队名称 |湖人 |
||Score |String |主队总分 |131 |
|GuestTeam |Name |String |客队名称 |爵士 |
||Score |String |客队总分 |107 |
|ScoreDetails |HostScoreList  |String |主队各节得分 |32,38,30,36 |
||GuestScoreList |String |客队各节得分 |22,23,29,33 |
|PlayerStats |Team  |String |球员所属球队 |湖人 |
||Name  |String |球员名称 |八村塁 |
||Minutes |String |出场时间 |28:58 |
||Points |String |得分 |22 |
||Rebounds |String |篮板 |10 |
||Assists |String |助攻 |0 |

示例（返回单场时）

```JSON
"BasketballMatchCard": {
    "MatchTime": "2026-04-13 08:30:00",
    "StatusText": "已完赛",
    "ShortMatchName": "NBA",
    "RoundName": "常规赛",
    "HostTeam": {
        "Name": "湖人",
        "Score": 131
    },
    "GuestTeam": {
        "Name": "爵士",
        "Score": 107
    },
    "ScoreDetails": {
        "HostScoreList": [
            32,
            30,
            33,
            36
        ],
        "GuestScoreList": [
            22,
            23,
            29,
            33
        ]
    },
    "PlayerStats": [
        {
            "Team": "湖人",
            "Name": "八村塁",
            "Minutes": "28:58",
            "Points": 22,
            "Rebounds": 10,
            "Assists": 0
        },
        ...
        {
            "Team": "爵士",
            "Name": "约翰-康查尔",
            "Minutes": "27:45",
            "Points": 4,
            "Rebounds": 7,
            "Assists": 2
        }
    ]
}
```

示例（返回多场时）

```JSON
"BasketballMatchCard": {
    "ShortMatchName": "NBA",
    "RoundName": "季后赛",
    "RecentMatches": [
        {
            "MatchTime": "2026-05-10 08:30:00",
            "StatusText": "已完赛",
            "ShortMatchName": "NBA",
            "RoundName": "季后赛",
            "HostTeam": {
                "Name": "湖人",
                "Score": 108
            },
            "GuestTeam": {
                "Name": "雷霆",
                "Score": 131
            },
            "ScoreDetails": {
                "HostScoreList": [
                    25,
                    34,
                    20,
                    29
                ],
                "GuestScoreList": [
                    31,
                    26,
                    33,
                    41
                ]
            },
            "PlayerStats": [
                {
                    "Team": "湖人",
                    "Name": "八村塁",
                    "Minutes": "38:42",
                    "Points": 21,
                    "Rebounds": 5,
                    "Assists": 4
                },
                ...
                {
                    "Team": "雷霆",
                    "Name": "尼古拉-托皮奇",
                    "Minutes": "2:38",
                    "Points": 0,
                    "Rebounds": 2,
                    "Assists": 0
                }
            ]
        },
        ...
        {
            "MatchTime": "2026-05-19 01:00:00",
            "StatusText": "未开始",
            "ShortMatchName": "NBA",
            "RoundName": "季后赛",
            "HostTeam": {
                "Name": "雷霆",
                "Score": 0
            },
            "GuestTeam": {
                "Name": "湖人",
                "Score": 0
            }
        }
    ]
}
```

&nbsp;

&nbsp;

<span id="Tf9NfuL7"></span>

## BasketballTeamCard **\-** NBA/CBA球队信息

query示例：NBA湖人队积分、CBA北京北汽排名

|字段名 |||类型 |字段说明 |样例值 |
|---|---|---|---|---|---|
|CardType | | |String |NBA/CBA球队信息卡片取值“basketball_team” | |
|BasketballTeamCard | | |Object |当CardType="basketball_team"时有值 | |
|Name | | |String |球队名称 |湖人 |
|Alias | | |String |球队别名或简称 |LAL |
|FullName | | |String |球队全称 |洛杉矶湖人 |
|Coach | | |String |主教练 |JJ\-雷迪克 |
|Venue | | |String |主场场馆 |加密中心球馆 |
|Season | | |String |赛季 |2025\-2026 |
|Standing |Rank | |String |排名 |0 |
||Wins  | |String |胜场 |4 |
||Losses | |String |负场 |6 |
||WinRate | |String |胜率文案 |40.0% |
||Division | |String |分区或分组 |WESTERN |
|Players |Name | |String |球员名称（必有） |贾里德\-范德比尔特 |
||Number | |String |球衣号码 |2 |
||Position | |String |场上位置 |PF |
||Height  | |String |身高  |203cm  |
||Weight | |String |体重 |97kg |
|RecentMatches |MatchTime | |String |比赛开始时间，北京时间，格式 YYYY\-MM\-DD HH:mm:ss |2026\-04\-30 10:00:00 |
||StatusText | |String |比赛状态 |已完赛 |
||ShortMatchName | |String |联赛简称<br><br> |NBA |
||RoundName | |String |单场所属阶段 |季后赛 |
||HostTeam |Name |String |主队名称 |湖人 |
|||Score |String |主队总分 |93 |
||GuestTeam |Name |String |客队名称 |火箭 |
|||Score |String |客队总分 |99 |
||ScoreDetails |HostScoreList  |String |主队各节得分数据 |28,19,20,26 |
|||GuestScoreList |String |客队各节得分数据 |21,30,25,23 |
||PlayerStats |Team  |String |球员所属球队 |湖人 |
|||Name  |String |球员名称 |勒布朗\-詹姆斯 |
|||Minutes |String |出场时间 |39:25 |
|||Points |String |得分 |25 |
|||Rebounds |String |篮板 |3 |
|||Assists |String |助攻 |7 |

示例

```JSON
"BasketballTeamCard": {
    "Name": "湖人",
    "Alias": "LAL",
    "Coach": "JJ-雷迪克",
    "Venue": "加密中心球馆",
    "Season": "2025-2026",
    "Standing": {
        "Rank": 0,
        "Wins": 4,
        "Losses": 6,
        "WinRate": "40.0%",
        "Division": "WESTERN"
    },
    "Players": [
        {
            "Name": "贾里德-范德比尔特",
            "Number": "2",
            "Position": "PF",
            "Height": "203cm",
            "Weight": "97kg"
        },
        ...
        {
            "Name": "凯文-卢尼",
            "Number": "55",
            "Position": "C",
            "Height": "206cm",
            "Weight": "101kg"
        }
    ],
    "RecentMatches": [
        {
            "MatchTime": "2026-04-30 10:00:00",
            "StatusText": "已完赛",
            "ShortMatchName": "NBA",
            "RoundName": "季后赛",
            "HostTeam": {
                "Name": "湖人",
                "Score": 93
            },
            "GuestTeam": {
                "Name": "火箭",
                "Score": 99
            },
            "ScoreDetails": {
                "HostScoreList": [
                    28,
                    19,
                    20,
                    26
                ],
                "GuestScoreList": [
                    21,
                    30,
                    25,
                    23
                ]
            },
            "PlayerStats": [
                {
                    "Team": "湖人",
                    "Name": "勒布朗-詹姆斯",
                    "Minutes": "39:25",
                    "Points": 25,
                    "Rebounds": 3,
                    "Assists": 7
                },
                ...
                {
                    "Team": "火箭",
                    "Name": "阿隆-霍勒迪",
                    "Minutes": "12:49",
                    "Points": 5,
                    "Rebounds": 0,
                    "Assists": 0
                 }
            ]
        },
        ...
        {
            "MatchTime": "2026-05-19 01:00:00",
            "StatusText": "未开始",
            "ShortMatchName": "NBA",
            "RoundName": "季后赛",
            "HostTeam": {
                "Name": "雷霆",
                "Score": 0
            },
            "GuestTeam": {
                "Name": "湖人",
                "Score": 0
            }
        }
    ]
}
```

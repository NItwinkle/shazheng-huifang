/* 体表地标（归一化空间 [0,1]³），由 scripts/build-landmarks.mjs 生成。
 * position 已吸附到网格表面，normal 为表面法线（向外）。
 * status: measured=几何极值实测 | proportional=骨度比例推算 | estimated=待人工复核。
 * 仅供定位工程参考，不构成临床取穴依据。
 */
window.MODEL_LANDMARKS = {
 "model": "models/human.glb",
 "status": "visual-surface-review-only",
 "points": {
  "crown": {
   "position": [
    0.5,
    1,
    0.458449
   ],
   "normal": [
    0.0009,
    0.999821,
    0.0189
   ],
   "basis": "头顶最高点：网格 max y 实测。",
   "status": "measured"
  },
  "antHairline": {
   "position": [
    0.5,
    0.956704,
    0.75624
   ],
   "normal": [
    -0.0002,
    0.450491,
    0.892781
   ],
   "basis": "前发际正中：额顶与额前过渡带前点。",
   "status": "estimated"
  },
  "glabella": {
   "position": [
    0.5,
    0.946149,
    0.767301
   ],
   "normal": [
    -0.0001,
    -0.122595,
    0.992457
   ],
   "basis": "眉间（印堂）：两眉内侧端之间，沿用既有 model-landmarks。",
   "status": "measured"
  },
  "nasion": {
   "position": [
    0.5,
    0.932423,
    0.797698
   ],
   "normal": [
    0.0006,
    0.496591,
    0.867984
   ],
   "basis": "鼻根：眉间下缘。",
   "status": "estimated"
  },
  "noseTip": {
   "position": [
    0.5,
    0.919443,
    0.841224
   ],
   "normal": [
    0.0011,
    -0.026701,
    0.999643
   ],
   "basis": "鼻尖：头面 max z 实测。",
   "status": "measured"
  },
  "ala": {
   "position": [
    0.5,
    0.912245,
    0.796849
   ],
   "normal": [
    -0.0032,
    -0.625789,
    0.779986
   ],
   "basis": "鼻翼中点水平：鼻尖下缘。",
   "status": "estimated"
  },
  "philtrum": {
   "position": [
    0.5,
    0.904131,
    0.804992
   ],
   "normal": [
    0.0002,
    0.122201,
    0.992505
   ],
   "basis": "人中：鼻下唇上中点。",
   "status": "estimated"
  },
  "mouth": {
   "position": [
    0.5,
    0.901474,
    0.800987
   ],
   "normal": [
    0.0002,
    -0.611473,
    0.791265
   ],
   "basis": "口：口裂中点（0.895–0.905 带前点）。",
   "status": "estimated"
  },
  "mentum": {
   "position": [
    0.5,
    0.872936,
    0.752155
   ],
   "normal": [
    0.0008,
    -0.873751,
    0.486373
   ],
   "basis": "颏（承浆）：下颌前点。",
   "status": "estimated"
  },
  "postHairline": {
   "position": [
    0.5,
    0.85891,
    0.223283
   ],
   "normal": [
    0,
    0.334201,
    -0.942502
   ],
   "basis": "后发际正中：项后发际实测。",
   "status": "measured"
  },
  "occiput": {
   "position": [
    0.5,
    0.942292,
    0.17095
   ],
   "normal": [
    -0.0001,
    -0.0377,
    -0.999289
   ],
   "basis": "枕后（枕外隆凸）：头面 max-z 后点实测。",
   "status": "measured"
  },
  "innerCanthusL": {
   "position": [
    0.462884,
    0.946227,
    0.733323
   ],
   "normal": [
    -0.158702,
    -0.677807,
    0.717908
   ],
   "basis": "目内眦：两眼内角。",
   "status": "estimated"
  },
  "innerCanthusR": {
   "position": [
    0.537116,
    0.946227,
    0.733323
   ],
   "normal": [
    0.161495,
    -0.677179,
    0.717878
   ],
   "basis": "目内眦。",
   "status": "estimated"
  },
  "outerCanthusL": {
   "position": [
    0.451733,
    0.943473,
    0.711493
   ],
   "normal": [
    -0.331,
    -0.5754,
    0.7479
   ],
   "basis": "目外眦：两眼外角。",
   "status": "estimated"
  },
  "outerCanthusR": {
   "position": [
    0.548258,
    0.943478,
    0.711467
   ],
   "normal": [
    0.330696,
    -0.573893,
    0.749191
   ],
   "basis": "目外眦。",
   "status": "estimated"
  },
  "pupilL": {
   "position": [
    0.462131,
    0.929434,
    0.724172
   ],
   "normal": [
    -0.351506,
    0.403607,
    0.844715
   ],
   "basis": "瞳孔垂线（承泣水平）。",
   "status": "estimated"
  },
  "pupilR": {
   "position": [
    0.537869,
    0.929434,
    0.724172
   ],
   "normal": [
    0.351682,
    0.403579,
    0.844656
   ],
   "basis": "瞳孔垂线。",
   "status": "estimated"
  },
  "zygomaL": {
   "position": [
    0.431091,
    0.912071,
    0.499615
   ],
   "normal": [
    -0.959176,
    -0.280393,
    0.036899
   ],
   "basis": "颧弓最高点。",
   "status": "estimated"
  },
  "zygomaR": {
   "position": [
    0.568909,
    0.912071,
    0.499615
   ],
   "normal": [
    0.956429,
    -0.291209,
    0.021001
   ],
   "basis": "颧弓最高点。",
   "status": "estimated"
  },
  "tragusL": {
   "position": [
    0.413573,
    0.926526,
    0.399432
   ],
   "normal": [
    -0.901485,
    -0.0166,
    0.432493
   ],
   "basis": "耳屏：耳前缘。",
   "status": "estimated"
  },
  "tragusR": {
   "position": [
    0.58641,
    0.926526,
    0.399406
   ],
   "normal": [
    0.901078,
    -0.0152,
    0.43339
   ],
   "basis": "耳屏。",
   "status": "estimated"
  },
  "earTipL": {
   "position": [
    0.412837,
    0.938802,
    0.390467
   ],
   "normal": [
    -0.982089,
    0.180898,
    0.052699
   ],
   "basis": "耳尖。",
   "status": "estimated"
  },
  "earTipR": {
   "position": [
    0.587154,
    0.938802,
    0.390467
   ],
   "normal": [
    0.981923,
    0.182504,
    0.050201
   ],
   "basis": "耳尖。",
   "status": "estimated"
  },
  "mastoidL": {
   "position": [
    0.450672,
    0.916541,
    0.262433
   ],
   "normal": [
    -0.680821,
    -0.379912,
    -0.626219
   ],
   "basis": "耳后乳突。",
   "status": "estimated"
  },
  "mastoidR": {
   "position": [
    0.549311,
    0.916546,
    0.262486
   ],
   "normal": [
    0.678295,
    -0.387197,
    -0.624495
   ],
   "basis": "耳后乳突。",
   "status": "estimated"
  },
  "mandibleAngleL": {
   "position": [
    0.436397,
    0.86851,
    0.312246
   ],
   "normal": [
    -0.735511,
    0.592709,
    -0.328205
   ],
   "basis": "下颌角。",
   "status": "estimated"
  },
  "mandibleAngleR": {
   "position": [
    0.563603,
    0.86851,
    0.312246
   ],
   "normal": [
    0.735789,
    0.592591,
    -0.327795
   ],
   "basis": "下颌角。",
   "status": "estimated"
  },
  "alaLateralL": {
   "position": [
    0.454822,
    0.908455,
    0.711679
   ],
   "normal": [
    -0.773862,
    -0.175791,
    0.60847
   ],
   "basis": "鼻翼外缘。",
   "status": "estimated"
  },
  "alaLateralR": {
   "position": [
    0.545178,
    0.908455,
    0.711652
   ],
   "normal": [
    0.773875,
    -0.175694,
    0.608481
   ],
   "basis": "鼻翼外缘。",
   "status": "estimated"
  },
  "mouthCornerL": {
   "position": [
    0.460103,
    0.899232,
    0.721838
   ],
   "normal": [
    -0.840492,
    -0.169298,
    0.514695
   ],
   "basis": "口角。",
   "status": "estimated"
  },
  "mouthCornerR": {
   "position": [
    0.539906,
    0.899227,
    0.721838
   ],
   "normal": [
    0.840897,
    -0.168799,
    0.514198
   ],
   "basis": "口角。",
   "status": "estimated"
  },
  "foreheadCornerL": {
   "position": [
    0.460539,
    0.953859,
    0.733004
   ],
   "normal": [
    -0.450593,
    0.481592,
    0.751688
   ],
   "basis": "额角发际。",
   "status": "estimated"
  },
  "foreheadCornerR": {
   "position": [
    0.539461,
    0.953859,
    0.733004
   ],
   "normal": [
    0.448319,
    0.47942,
    0.754431
   ],
   "basis": "额角发际。",
   "status": "estimated"
  },
  "browL": {
   "position": [
    0.461198,
    0.94844,
    0.739529
   ],
   "normal": [
    -0.361201,
    -0.351501,
    0.863702
   ],
   "basis": "眉中（鱼腰水平）。",
   "status": "estimated"
  },
  "browR": {
   "position": [
    0.538802,
    0.94844,
    0.739529
   ],
   "normal": [
    0.362189,
    -0.351289,
    0.863374
   ],
   "basis": "眉中。",
   "status": "estimated"
  },
  "infraorbitalL": {
   "position": [
    0.472418,
    0.923831,
    0.752367
   ],
   "normal": [
    -0.502321,
    0.278411,
    0.818634
   ],
   "basis": "眶下（四白）。",
   "status": "estimated"
  },
  "infraorbitalR": {
   "position": [
    0.527574,
    0.923831,
    0.752367
   ],
   "normal": [
    0.50241,
    0.278006,
    0.818717
   ],
   "basis": "眶下。",
   "status": "estimated"
  },
  "neckLateralL": {
   "position": [
    0.430655,
    0.835271,
    0.500305
   ],
   "normal": [
    -0.257797,
    0.716691,
    0.647992
   ],
   "basis": "侧颈（人迎/扶突水平）。",
   "status": "estimated"
  },
  "neckLateralR": {
   "position": [
    0.569337,
    0.835261,
    0.500225
   ],
   "normal": [
    0.255904,
    0.716811,
    0.64861
   ],
   "basis": "侧颈。",
   "status": "estimated"
  },
  "tiantu": {
   "position": [
    0.5,
    0.819384,
    0.584255
   ],
   "normal": [
    -0.0005,
    0.481205,
    0.876608
   ],
   "basis": "天突（胸骨上窝）：颈胸交界前凹实测。",
   "status": "measured"
  },
  "C7": {
   "position": [
    0.5,
    0.798107,
    0.075966
   ],
   "normal": [
    0,
    0.26431,
    -0.964438
   ],
   "basis": "大椎（C7 棘突下）：项后最凸后点实测。",
   "status": "measured"
  },
  "xiphoid": {
   "position": [
    0.499991,
    0.672692,
    0.801464
   ],
   "normal": [
    -0.0008,
    0.122201,
    0.992505
   ],
   "basis": "剑突尖：天突下 9 寸（前中线 23 寸比例），胸骨前表面。",
   "status": "proportional"
  },
  "navel": {
   "position": [
    0.49994,
    0.541708,
    0.807591
   ],
   "normal": [
    0,
    -0.0069,
    0.999976
   ],
   "basis": "脐中：剑突下 8 寸，腹前表面。",
   "status": "proportional"
  },
  "qugu": {
   "position": [
    0.500265,
    0.479193,
    0.736612
   ],
   "normal": [
    0.0008,
    -0.792315,
    0.610112
   ],
   "basis": "曲骨（耻骨联合上缘）：脐下 5 寸，耻骨前表面。",
   "status": "proportional"
  },
  "perineum": {
   "position": [
    0.480582,
    0.449498,
    0.505769
   ],
   "normal": [
    0.987741,
    -0.143606,
    -0.061203
   ],
   "basis": "会阴：腿分叉点实测（z 取中面）。",
   "status": "measured"
  },
  "nippleL": {
   "position": [
    0.3743,
    0.730327,
    0.722262
   ],
   "normal": [
    -0.64358,
    -0.113097,
    0.756977
   ],
   "basis": "乳头：沿用既有 model-landmarks。",
   "status": "measured"
  },
  "nippleR": {
   "position": [
    0.607668,
    0.728852,
    0.754701
   ],
   "normal": [
    0.480596,
    -0.227598,
    0.846892
   ],
   "basis": "乳头。",
   "status": "measured"
  },
  "axillaAntL": {
   "position": [
    0.249251,
    0.724141,
    0.514098
   ],
   "normal": [
    0.1014,
    -0.0517,
    0.993501
   ],
   "basis": "腋前纹头（臂前折线端）。",
   "status": "estimated"
  },
  "axillaAntR": {
   "position": [
    0.751074,
    0.724122,
    0.515053
   ],
   "normal": [
    -0.071499,
    -0.0499,
    0.996192
   ],
   "basis": "腋前纹头。",
   "status": "estimated"
  },
  "axillaPostL": {
   "position": [
    0.284715,
    0.709986,
    0.262407
   ],
   "normal": [
    0.821206,
    -0.570604,
    -0.0057
   ],
   "basis": "腋后纹头（臂后折线端）。",
   "status": "estimated"
  },
  "axillaPostR": {
   "position": [
    0.715336,
    0.709995,
    0.26246
   ],
   "normal": [
    -0.820803,
    -0.571202,
    -0.0031
   ],
   "basis": "腋后纹头。",
   "status": "estimated"
  },
  "T3": {
   "position": [
    0.495747,
    0.750163,
    0.052439
   ],
   "normal": [
    0.264007,
    -0.088802,
    -0.960424
   ],
   "basis": "T3 棘突下：C7 下 3 椎。",
   "status": "proportional"
  },
  "T5": {
   "position": [
    0.5,
    0.722652,
    0.085807
   ],
   "normal": [
    0.0001,
    -0.301189,
    -0.953565
   ],
   "basis": "T5 棘突下。",
   "status": "proportional"
  },
  "T7": {
   "position": [
    0.5,
    0.684124,
    0.166096
   ],
   "normal": [
    -0.0013,
    -0.367508,
    -0.93002
   ],
   "basis": "T7 棘突下（膈俞水平）。",
   "status": "proportional"
  },
  "T9": {
   "position": [
    0.5,
    0.652741,
    0.221108
   ],
   "normal": [
    0.0019,
    -0.19119,
    -0.981551
   ],
   "basis": "T9 棘突下。",
   "status": "proportional"
  },
  "T11": {
   "position": [
    0.5,
    0.613277,
    0.226227
   ],
   "normal": [
    -0.0004,
    0.094403,
    -0.995534
   ],
   "basis": "T11 棘突下。",
   "status": "proportional"
  },
  "L2": {
   "position": [
    0.5,
    0.558819,
    0.158219
   ],
   "normal": [
    -0.0002,
    0.325214,
    -0.94564
   ],
   "basis": "L2 棘突下（肾俞水平，腰曲最前）。",
   "status": "proportional"
  },
  "L4": {
   "position": [
    0.500009,
    0.528849,
    0.125779
   ],
   "normal": [
    0,
    0.0021,
    -0.999998
   ],
   "basis": "L4 棘突下。",
   "status": "proportional"
  },
  "sacrum": {
   "position": [
    0.466076,
    0.449411,
    0.340468
   ],
   "normal": [
    0.864433,
    -0.181307,
    -0.468918
   ],
   "basis": "尾骶（腰俞/骶管裂孔）。",
   "status": "estimated"
  },
  "scapulaMedialL": {
   "position": [
    0.363012,
    0.73011,
    0.093976
   ],
   "normal": [
    -0.506198,
    -0.338999,
    -0.792997
   ],
   "basis": "肩胛冈内缘（3 寸线锚点，胸廓最窄偏外）。",
   "status": "estimated"
  },
  "scapulaMedialR": {
   "position": [
    0.637116,
    0.730067,
    0.093525
   ],
   "normal": [
    0.505212,
    -0.337608,
    -0.794218
   ],
   "basis": "肩胛冈内缘。",
   "status": "estimated"
  },
  "acromionL": {
   "position": [
    0.259649,
    0.806583,
    0.293202
   ],
   "normal": [
    -0.808276,
    0.587583,
    0.037899
   ],
   "basis": "肩峰：臂最高点实测。",
   "status": "measured"
  },
  "acromionR": {
   "position": [
    0.740351,
    0.806583,
    0.293202
   ],
   "normal": [
    0.808241,
    0.58763,
    0.037902
   ],
   "basis": "肩峰。",
   "status": "measured"
  },
  "elbowL": {
   "position": [
    0.156329,
    0.696196,
    0.274767
   ],
   "normal": [
    -0.879168,
    0.456783,
    0.135695
   ],
   "basis": "肘横纹：肩峰→腕中上 9/12 比例，臂轴实测。",
   "status": "proportional"
  },
  "elbowR": {
   "position": [
    0.843671,
    0.696196,
    0.274767
   ],
   "normal": [
    0.879307,
    0.456603,
    0.135401
   ],
   "basis": "肘横纹。",
   "status": "proportional"
  },
  "wristL": {
   "position": [
    0.059923,
    0.517205,
    0.411474
   ],
   "normal": [
    0.652407,
    -0.639307,
    -0.407004
   ],
   "basis": "腕横纹：臂远端变细处，臂轴实测。",
   "status": "proportional"
  },
  "wristR": {
   "position": [
    0.940077,
    0.517205,
    0.411474
   ],
   "normal": [
    -0.652506,
    -0.639206,
    -0.407004
   ],
   "basis": "腕横纹。",
   "status": "proportional"
  },
  "fingertipL": {
   "position": [
    0,
    0.462236,
    0.399592
   ],
   "normal": [
    -0.997227,
    -0.070902,
    0.022601
   ],
   "basis": "指尖：网格 min x 实测。",
   "status": "measured"
  },
  "fingertipR": {
   "position": [
    1,
    0.462236,
    0.399592
   ],
   "normal": [
    0.997238,
    -0.070903,
    0.022101
   ],
   "basis": "指尖：max x 实测。",
   "status": "measured"
  },
  "heguL": {
   "position": [
    0.034001,
    0.52788,
    0.502851
   ],
   "normal": [
    -0.728594,
    0.350797,
    0.588295
   ],
   "basis": "合谷：沿用既有 model-landmarks。",
   "status": "measured"
  },
  "heguR": {
   "position": [
    0.965999,
    0.52788,
    0.502851
   ],
   "normal": [
    0.728594,
    0.350797,
    0.588295
   ],
   "basis": "合谷。",
   "status": "measured"
  },
  "patellaBaseL": {
   "position": [
    0.365374,
    0.276244,
    0.603724
   ],
   "normal": [
    0.047601,
    -0.39921,
    0.915623
   ],
   "basis": "髌底：耻骨联合下 18 寸，膝前表面。",
   "status": "proportional"
  },
  "patellaBaseR": {
   "position": [
    0.634626,
    0.276239,
    0.603724
   ],
   "normal": [
    -0.047202,
    -0.399916,
    0.915336
   ],
   "basis": "髌底。",
   "status": "proportional"
  },
  "patellaTipL": {
   "position": [
    0.366573,
    0.24774,
    0.543938
   ],
   "normal": [
    0.121597,
    -0.256093,
    0.958974
   ],
   "basis": "髌尖（膝中）。",
   "status": "proportional"
  },
  "patellaTipR": {
   "position": [
    0.633402,
    0.247701,
    0.544601
   ],
   "normal": [
    -0.119995,
    -0.25539,
    0.959363
   ],
   "basis": "髌尖。",
   "status": "proportional"
  },
  "dubiL": {
   "position": [
    0.344185,
    0.259495,
    0.556935
   ],
   "normal": [
    -0.444396,
    -0.247398,
    0.860992
   ],
   "basis": "犊鼻（髌骨外下缘，外膝眼）。",
   "status": "estimated"
  },
  "dubiR": {
   "position": [
    0.655824,
    0.25949,
    0.556961
   ],
   "normal": [
    0.444316,
    -0.246709,
    0.861231
   ],
   "basis": "犊鼻。",
   "status": "estimated"
  },
  "medMalleolusL": {
   "position": [
    0.385443,
    0.039261,
    0.444551
   ],
   "normal": [
    0.997348,
    0.070496,
    -0.018099
   ],
   "basis": "内踝尖：髌尖下 15 寸，内侧面。",
   "status": "proportional"
  },
  "medMalleolusR": {
   "position": [
    0.614566,
    0.039261,
    0.444551
   ],
   "normal": [
    -0.997358,
    0.070297,
    -0.018299
   ],
   "basis": "内踝尖。",
   "status": "proportional"
  },
  "latMalleolusL": {
   "position": [
    0.300051,
    0.029276,
    0.441368
   ],
   "normal": [
    -0.935681,
    0.333993,
    0.113798
   ],
   "basis": "外踝尖：较内踝略高，外侧面。",
   "status": "proportional"
  },
  "latMalleolusR": {
   "position": [
    0.699803,
    0.029247,
    0.441341
   ],
   "normal": [
    0.934356,
    0.337784,
    0.113495
   ],
   "basis": "外踝尖。",
   "status": "proportional"
  },
  "greaterTrochanterL": {
   "position": [
    0.336816,
    0.518054,
    0.489138
   ],
   "normal": [
    -0.987494,
    0.148799,
    -0.0521
   ],
   "basis": "股骨大转子：腘横纹上 19 寸，外侧面。",
   "status": "proportional"
  },
  "greaterTrochanterR": {
   "position": [
    0.663184,
    0.518059,
    0.489165
   ],
   "normal": [
    0.987474,
    0.148896,
    -0.052199
   ],
   "basis": "大转子。",
   "status": "proportional"
  },
  "glutealFoldL": {
   "position": [
    0.359307,
    0.503474,
    0.231108
   ],
   "normal": [
    -0.806783,
    0.164496,
    -0.567488
   ],
   "basis": "臀沟（臀横纹），后面。",
   "status": "estimated"
  },
  "glutealFoldR": {
   "position": [
    0.640702,
    0.503479,
    0.231108
   ],
   "normal": [
    0.803618,
    0.165704,
    -0.571613
   ],
   "basis": "臀沟。",
   "status": "estimated"
  },
  "poplitealL": {
   "position": [
    0.380881,
    0.25125,
    0.157794
   ],
   "normal": [
    0.539078,
    0.150694,
    -0.828666
   ],
   "basis": "腘横纹（平髌尖），后面。",
   "status": "proportional"
  },
  "poplitealR": {
   "position": [
    0.619093,
    0.251255,
    0.157635
   ],
   "normal": [
    -0.541905,
    0.149101,
    -0.827108
   ],
   "basis": "腘横纹。",
   "status": "proportional"
  },
  "soleL": {
   "position": [
    0.386307,
    0.010993,
    0.648895
   ],
   "normal": [
    0.981503,
    -0.181901,
    -0.0597
   ],
   "basis": "足底（涌泉，左足）。",
   "status": "estimated"
  },
  "soleR": {
   "position": [
    0.613693,
    0.010993,
    0.648895
   ],
   "normal": [
    -0.981527,
    -0.181805,
    -0.059602
   ],
   "basis": "足底（右足）。",
   "status": "estimated"
  },
  "toeTipL": {
   "position": [
    0.38576,
    0.009759,
    0.686693
   ],
   "normal": [
    0.976269,
    -0.200194,
    0.082597
   ],
   "basis": "趾甲角（近端）。",
   "status": "estimated"
  },
  "toeTipR": {
   "position": [
    0.61424,
    0.009759,
    0.686693
   ],
   "normal": [
    -0.976296,
    -0.200099,
    0.0825
   ],
   "basis": "趾甲角。",
   "status": "estimated"
  }
 }
};

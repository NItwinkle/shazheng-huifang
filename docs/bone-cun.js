/* GB/T 12346—2021 table 1: anatomical segments, NOT whole-body scaling.
 * A relation defines one axis only; bone/tendon/crease conditions still apply.
 */
(function () {
  const rows = [
    ['head','前发际正中','后发际正中',12,'纵向'],
    ['forehead','眉间','前发际正中',3,'纵向'],
    ['nape','第7颈椎棘突下','后发际正中',3,'纵向'],
    ['headWidth','左额角发际','右额角发际',9,'横向'],
    ['occiputWidth','左乳突','右乳突',9,'横向'],
    ['sternum','胸骨上窝','剑突尖',9,'纵向'],
    ['upperAbdomen','脐中','剑突尖',8,'纵向'],
    ['lowerAbdomen','脐中','耻骨联合上缘',5,'纵向'],
    ['coracoidWidth','一侧肩胛骨喙突内侧缘','对侧肩胛骨喙突内侧缘',12,'横向'],
    ['nippleWidth','一侧乳头','对侧乳头',8,'横向'],
    ['backWidth','后正中线','肩胛骨内侧缘',3,'横向'],
    ['upperArmFront','肘横纹','腋前纹头',9,'纵向'],
    ['upperArmBack','尺骨鹰嘴','腋后纹头',9,'纵向'],
    ['forearm','腕掌（背）侧远端横纹','肘横纹（平尺骨鹰嘴）',12,'纵向'],
    ['thighFront','髌底','耻骨联合上缘',18,'纵向'],
    ['patella','髌底','髌尖',2,'纵向'],
    ['legMedial','内踝尖','髌尖（平膝中）',15,'纵向'],
    ['legMedial13','内踝尖','胫骨内侧髁下方阴陵泉',13,'纵向'],
    ['thighLateral','腘横纹（平髌尖）','股骨大转子',19,'纵向'],
    ['thighBack','腘横纹','臀沟',14,'纵向'],
    ['legLateral','外踝尖','腘横纹（平髌尖）',16,'纵向'],
    ['footMedial','足底','内踝尖',3,'纵向']
  ];
  const segments = Object.fromEntries(rows.map(([id,start,end,total,axis]) => [id,{id,start,end,total,axis}]));
  function forPoint(record) {
    if (!record) return [];
    const text = record.location;
    const result = [];
    const add = (id,target,label) => {
      const segment = segments[id];
      if (!segment || !Number.isFinite(target) || target < 0 || target > segment.total) return;
      result.push({...segment,target,label});
    };
    let m;
    if ((m = text.match(/脐中([上下])(\d+(?:\.\d+)?)寸/))) add(m[1] === '上' ? 'upperAbdomen' : 'lowerAbdomen', +m[2], m[0]);
    if ((m = text.match(/前发际(?:正中)?(?:直)?上(\d+(?:\.\d+)?)寸/))) add('head', +m[1], m[0]);
    if ((m = text.match(/后发际正中直上(\d+(?:\.\d+)?)寸/))) add('head', 12 - +m[1], m[0]);
    if ((m = text.match(/腕(?:掌侧远端|背侧远端|背)横纹上(\d+(?:\.\d+)?)寸/))) add('forearm', +m[1], m[0]);
    if ((m = text.match(/肘横纹下(\d+(?:\.\d+)?)寸/))) add('forearm', 12 - +m[1], m[0]);
    if ((m = text.match(/尺骨鹰嘴尖下(\d+(?:\.\d+)?)寸/))) add('forearm', 12 - +m[1], m[0]);
    if ((m = text.match(/腋前纹头下(\d+(?:\.\d+)?)寸/))) add('upperArmFront', 9 - +m[1], m[0]);
    if ((m = text.match(/肘横纹上(\d+(?:\.\d+)?)寸/))) add('upperArmFront', +m[1], m[0]);
    if ((m = text.match(/髌底(?:内侧端)?上(\d+(?:\.\d+)?)寸/))) add('thighFront', +m[1], m[0]);
    if ((m = text.match(/内踝尖上(\d+(?:\.\d+)?)寸/))) add('legMedial', +m[1], m[0]);
    if ((m = text.match(/外踝尖上(\d+(?:\.\d+)?)寸/))) add('legLateral', +m[1], m[0]);
    if ((m = text.match(/腘横纹上(\d+(?:\.\d+)?)寸/))) add(text.includes('股外侧') ? 'thighLateral' : 'thighBack', +m[1], m[0]);
    if ((m = text.match(/腘横纹下(\d+(?:\.\d+)?)寸/))) add('legLateral', 16 - +m[1], m[0]);
    if ((m = text.match(/臀沟下(\d+(?:\.\d+)?)寸/))) add('thighBack', 14 - +m[1], m[0]);
    if ((m = text.match(/阴陵泉\(SP9\)下(\d+(?:\.\d+)?)寸/))) add('legMedial13', 13 - +m[1], m[0]);
    if ((m = text.match(/后正中线旁开(\d+(?:\.\d+)?)寸/)) && /在[背腰]部/.test(text)) add('backWidth', +m[1], m[0]);
    if ((m = text.match(/前正中线旁开(\d+(?:\.\d+)?)寸/))) {
      if (/在(?:上|下)?腹部/.test(text)) add('nippleWidth', 4 + +m[1], m[0] + '（中线为4寸刻度）');
      else if (text.includes('在前胸部')) add('coracoidWidth', 6 + +m[1], m[0] + '（中线为6寸刻度）');
    }
    if ((m = text.match(/胸骨上窝下(\d+(?:\.\d+)?)寸/))) add('sternum', +m[1], m[0]);
    return result;
  }
  window.BONE_CUN = Object.freeze({segments, forPoint});
})();

/* Display-only guide seeds for human.glb. Not anatomical landmark validation.
 * These pose-specific seeds are projected onto the skin, never used to move points.
 * Cun totals/names come exclusively from BONE_CUN (GB/T 12346—2021).
 */
(function () {
  const guide=(a,b,view='front',bilateral=false,extra={})=>({a,b,view,bilateral,status:'unverified-model-guide',...extra});
  window.MODEL_RULER_GUIDES={
    head:guide([.5,.98,.95],[.5,.905,.02],'head',false,{via:[.5,1.025,.50],center:[.5,.935,.50]}),
    forehead:guide([.5,.932,.9],[.5,.955,.9]),
    nape:guide([.5,.80,.1],[.5,.918,.1],'back'),
    headWidth:guide([.445,.955,.9],[.555,.955,.9]),
    occiputWidth:guide([.445,.908,.1],[.555,.908,.1],'back'),
    sternum:guide([.5,.80,.9],[.5,.685,.9]),
    upperAbdomen:guide([.5,.60,.9],[.5,.685,.9]),
    lowerAbdomen:guide([.5,.60,.9],[.5,.52,.9]),
    coracoidWidth:guide([.34,.79,.9],[.66,.79,.9]),
    nippleWidth:guide([.37,.73,.9],[.61,.73,.9]),
    backWidth:guide([.5,.72,.1],[.61,.72,.1],'back',true),
    upperArmFront:guide([.85,.64,.9],[.73,.75,.9],'front',true),
    upperArmBack:guide([.85,.64,.1],[.73,.75,.1],'back',true),
    forearm:guide([.93,.56,.9],[.85,.64,.9],'front',true),
    thighFront:guide([.625,.285,.9],[.625,.52,.9],'front',true),
    patella:guide([.625,.285,.9],[.625,.265,.9],'front',true),
    legMedial:guide([.60,.075,.30],[.60,.265,.36],'medial',true),
    legMedial13:guide([.60,.075,.30],[.60,.245,.36],'medial',true),
    thighLateral:guide([.64,.265,.5],[.64,.52,.5],'lateral',true),
    thighBack:guide([.625,.265,.1],[.625,.515,.1],'back',true),
    legLateral:guide([.64,.075,.30],[.64,.265,.36],'lateral',true),
    footMedial:guide([.60,.012,.30],[.60,.075,.30],'medial',true)
  };
})();

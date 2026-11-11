/**
 * Catálogo EMBUTIDO de canais oficiais (fallback garantido).
 *
 * O app tenta as listas públicas do iptv-org na inicialização; se o filtro
 * de domínio oficial deixar o resultado vazio (ou a internet falhar), este
 * catálogo garante que a interface SEMPRE tenha canais para navegar.
 * Todos os streams abaixo são transmissões oficiais de emissoras públicas
 * ou canais FAST oficiais — nenhum re-stream pirata.
 */
export interface BuiltinChannel {
  name: string;
  group: string;
  language: 'PT' | 'ES' | 'EN';
  url: string;
}

const B = (name: string, group: string, language: 'PT' | 'ES' | 'EN', url: string): BuiltinChannel => ({
  name,
  group,
  language,
  url,
});

export const BUILTIN_CHANNELS: BuiltinChannel[] = [
  // ---- TV Aberta (Brasil) ----
  B('TV Brasil', 'TV Aberta', 'PT', 'https://tvbrasil-stream.ebc.com.br/index.m3u8'),
  B('TV Cultura', 'TV Aberta', 'PT', 'https://player-tvcultura.stream.uol.com.br/live/tvcultura.m3u8'),
  B('Cultura Fast', 'TV Aberta', 'PT', 'https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8'),
  B('TV Câmara', 'TV Aberta', 'PT', 'https://stream3.camara.gov.br/tv1/manifest.m3u8'),
  B('TV Câmara 2', 'TV Aberta', 'PT', 'https://stream3.camara.gov.br/tv2/manifest.m3u8'),
  B('Canal Gov', 'Notícias', 'PT', 'https://canalgov-stream.ebc.com.br/index.m3u8'),
  B('TVE RS', 'TV Aberta', 'PT', 'https://streaming.procergs.com.br:8443/tve/stve/playlist.m3u8'),
  B('SESC TV', 'Cultura', 'PT', 'https://slbps-ml-sambatech.akamaized.net/samba-live/2472/7424/8a00fe7cc36ac263b2c3e9324497d5ff/video/93a9920d-1b24-4c5e-a7d2-63d5489f59b5_index.m3u8'),
  B('Record News', 'Notícias', 'PT', 'https://rnw-rn.otteravision.com/rnw/rn/rnw_rn.m3u8'),
  B('CNN Brasil', 'Notícias', 'PT', 'https://d25usgadhphvwi.cloudfront.net/hls/main.m3u8'),
  B('ge FAST', 'Esportes', 'PT', 'https://dfr80qz435crc.cloudfront.net/EFGH/Amagi/Globo/GE_Fast_BR/GE_Fast.m3u8'),
  B('Amazon Sat', 'TV Aberta', 'PT', 'https://amazonsat.brasilstream.com.br/hls/amazonsat/index.m3u8'),

  // ---- Portugal ----
  B('RTP 1', 'TV Aberta', 'PT', 'https://streaming-live.rtp.pt/liverepeater/rtp1HD.smil/playlist.m3u8'),
  B('RTP 2', 'TV Aberta', 'PT', 'https://streaming-live.rtp.pt/liverepeater/rtp2HD.smil/playlist.m3u8'),
  B('RTP Memória', 'TV Aberta', 'PT', 'https://streaming-live.rtp.pt/liverepeater/smil:rtpmem.smil/playlist.m3u8'),
  B('RTP Notícias', 'Notícias', 'PT', 'https://streaming-live.rtp.pt/livetvhlsDVR/rtpnHDdvr.smil/playlist.m3u8'),
  B('RTP Internacional', 'Internacional', 'PT', 'https://streaming-live.rtp.pt/liverepeater/smil:rtpi.smil/playlist.m3u8'),
  B('RTP África', 'Internacional', 'PT', 'https://streaming-live.rtp.pt/liverepeater/smil:rtpafrica.smil/playlist.m3u8'),
  B('Porto Canal', 'TV Aberta', 'PT', 'https://pull-live-156-1.global.ssl.fastly.net/pc5865dc25400thmb-ea6bf03b14fa318f7133/smil:pc1-jhrgyuoqe5865db-68tkgb14fa318f7133f03.smil/playlist.m3u8'),

  // ---- Espanha ----
  B('La 1', 'TV Aberta', 'ES', 'https://ztnr.rtve.es/ztnr/1688877.m3u8'),
  B('La 2', 'TV Aberta', 'ES', 'https://rtvelivestream.rtve.es/rtvesec/la2/la2_main.m3u8'),
  B('24 Horas RTVE', 'Notícias', 'ES', 'https://ztnr.rtve.es/ztnr/1694255.m3u8'),
  B('Clan', 'Infantil', 'ES', 'https://lge-lgla2.otteravision.com/lge/lgcla/lgcla.m3u8'),
  B('Teledeporte', 'Esportes', 'ES', 'https://rtve01p.origin.c21livecloud.com/live-origin/tdp-hls/bitrate_1.m3u8'),
  B('Radio 3 RTVE', 'Música', 'ES', 'https://rtvelivestream.rtve.es/rtvesec/rne/rne3_main.m3u8'),
  B('3CatInfo', 'Notícias', 'ES', 'https://directes-tv-int.3catdirectes.cat/live-origin/canal324-hls/master.m3u8'),
  B('ETB1', 'TV Aberta', 'ES', 'https://cdn1.etbon.eus/etb1on/index.m3u8'),
  B('ETB2', 'TV Aberta', 'ES', 'https://cdn1.etbon.eus/etb2on/index.m3u8'),
  B('Canal Sur Andalucía', 'TV Aberta', 'ES', 'https://dfk2a268yviz9.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-ddiii1m6jt6of/CanalSurAndaluciaES.m3u8'),
  B('Galicia TV Europa', 'Internacional', 'ES', 'https://crtvg-europa.flumotion.cloud/playlist.m3u8'),
  B('Televisión Canaria', 'TV Aberta', 'ES', 'https://rtvclive.flumotion.cloud/rtvc1live/smil:channel1PRG.smil/playlist.m3u8'),
  B('Real Madrid TV', 'Esportes', 'ES', 'https://rmtv.akamaized.net/hls/live/2043153/rmtv-es-web/master.m3u8'),
  B('Sol Música', 'Música', 'ES', 'https://d2glyu450vvghm.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-21u4g5cjglv02/sm.m3u8'),

  // ---- Canais de filme (FAST oficiais) ----
  B('Cine Friki', 'Filmes', 'ES', 'https://d2mr4fu91mjx9m.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-rb0tx75ojbc5u/CineFriki_ES.m3u8'),
  B('Cine Western', 'Filmes', 'ES', 'https://d2nq34q0i1r3la.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-awohw8g217ho8/CineWestern_ES.m3u8'),
  B('Cine Romántico', 'Filmes', 'ES', 'https://d1si3n1st4nkgb.cloudfront.net/10502/88886011/hls/master.m3u8?ads.xumo_channelId=88886011'),
  B('Popcorn Central', 'Filmes', 'ES', 'https://oly-ftvpc.otteravision.com/oly/ftvpc/ftvpc.m3u8'),
  B('Anime Vision', 'Filmes', 'ES', 'https://d1ujfw1zyymzyd.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-a6fukwkbxmex8/live/fast-channel-animevision-64527ec0/fast-channel-animevision-64527ec0.m3u8'),

  // ---- Documentários ----
  B('WildEarth', 'Documentários', 'EN', 'https://dqga3jatxofgx.cloudfront.net/WildEarth.m3u8'),
  B('Docurama', 'Documentários', 'EN', 'https://docurama-plex-ingest.cinedigm.com/playlist.m3u8'),
  B('Documentary+', 'Documentários', 'EN', 'https://ef79b15c8c7c46c7a9de9d33001dbd07.mediatailor.us-west-2.amazonaws.com/v1/master/ba62fe743df0fe93366eba3a257d792884136c7f/LINEAR-859-DOCUMENTARYPLUS-DOCUMENTARYPLUS/mt/documentaryplus/859/hls/master/playlist.m3u8'),
  B('Terra Mater WILD', 'Documentários', 'EN', 'https://53ff3982.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/UmxheHhUVi1ldV9UZXJyYU1hdGVyV2lsZF9ITFM/playlist.m3u8'),
  B('WaterBear', 'Documentários', 'EN', 'https://amg01415-waterbearnetwor-waterbear-samsunguk-1h0y8.amagi.tv/playlist/amg01415-waterbearnetwor-waterbear-samsunguk/playlist.m3u8'),
  B('Get.factual', 'Documentários', 'EN', 'https://d1nhni5l2n8hjt.cloudfront.net/gf.m3u8'),

  // ---- Música ----
  B('Now 70s', 'Música', 'EN', 'https://lightningnow70-samsungau.amagi.tv/playlist.m3u8'),
  B('Now 80s', 'Música', 'EN', 'https://lightningnow80-samsungau.amagi.tv/playlist.m3u8'),
  B('NOW Rock', 'Música', 'EN', 'https://lightning-now90s-samsungnz.amagi.tv/playlist.m3u8'),
  B('Qello Concerts', 'Música', 'EN', 'https://lotus.stingray.com/manifest/qello-qello001-montreal/samsungtvplus/master.m3u8'),
  B('Deluxe Music', 'Música', 'EN', 'https://sdn-global-live-streaming-packager-cache.3qsdn.com/13456/13456_264_live.m3u8'),
  B('TikTok Radio Brasil', 'Música', 'PT', 'https://d1bl6tskrpq9ze.cloudfront.net/hls/master.m3u8?ads.xumo_channelId=99992529'),

  // ---- Infantil ----
  B('PBS Kids', 'Infantil', 'EN', 'https://livestream.pbskids.org/out/v1/14507d931bbe48a69287e4850e53443c/est.m3u8'),
  B('Tiny Pop', 'Infantil', 'EN', 'https://amg01753-narrativeuk-amg01753c1-lg-gb-1830.playouts.now.amagi.tv/playlist/amg01753-narrativeuk-tinypop-lggb/playlist.m3u8'),
  B('Super Simple Songs', 'Infantil', 'EN', 'https://janson-supersimplesongs-1-us.roku.wurl.tv/playlist.m3u8'),
  B('Baby Shark TV', 'Infantil', 'EN', 'https://newidco-babysharktv-1-us.roku.wurl.tv/playlist.m3u8'),

  // ---- Notícias internacionais ----
  B('DW Español', 'Notícias', 'ES', 'https://dwamdstream104.akamaized.net/hls/live/2015530/dwstream104/master.m3u8'),
  B('France 24 Español', 'Notícias', 'ES', 'https://live.france24.com/hls/live/2037220-b/F24_ES_HI_HLS/master_5000.m3u8'),

  // ---- América Latina (emissoras públicas) ----
  B('Canal Once', 'TV Aberta', 'ES', 'https://vivo.canaloncelive.tv/securepkgr3/oncemexico/playlist.m3u8'),
  B('Capital 21', 'TV Aberta', 'ES', 'https://video.cdmx.gob.mx/redes/stream.m3u8'),
  B('Justicia TV', 'Notícias', 'ES', 'https://live-scjn.ovp-vivaro.digital/ovp-origin/638a22b47746d/playlist.m3u8'),
  B('Señal Colombia', 'TV Aberta', 'ES', 'https://streaming.rtvc.gov.co/TV_Senal_Colombia_live/smil:live.smil/playlist.m3u8'),
  B('Canal Institucional', 'Notícias', 'ES', 'https://streaming.rtvc.gov.co/TV_CanalInstitucional_live/smil:live.smil/playlist.m3u8'),
  B('TV Senado Chile', 'Notícias', 'ES', 'https://janus-tv-ply.senado.cl/playlist/playlist.m3u8'),
  B('Paraguay TV', 'TV Aberta', 'ES', 'https://stream.paraguaytv.gov.py/memfs/bbe36fed-9b49-4d1d-adaa-4bd6d1b2e386.m3u8'),
  B('Educa TV', 'Documentários', 'ES', 'https://avm.ecuamedia.net/educatv/live/playlist.m3u8'),
  B('Quince UCR', 'TV Aberta', 'ES', 'https://wowza.ucr.ac.cr/quinceucr/_definst_/quinceucr.stream/playlist.m3u8'),
  B('Canal 4 RD', 'TV Aberta', 'ES', 'https://cdn.protvradiostream.com/canal4rd-1/ngrp:canal4rd-1_all/playlist.m3u8'),
];

import { useState, useRef, useCallback, useEffect } from "react";

/* ── 유틸 ── */
const fmtSize = (b) => b < 1048576 ? (b/1024).toFixed(1)+" KB" : (b/1048576).toFixed(1)+" MB";
const fmtDate = () => {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`;
};
const fileIcon = (type) => {
  if (!type) return "📁";
  if (type.startsWith("image/")) return "🖼️";
  if (type.startsWith("video/")) return "🎬";
  if (type.startsWith("audio/")) return "🎵";
  if (type.includes("pdf")) return "📄";
  if (type.includes("zip")||type.includes("rar")) return "🗜️";
  return "📁";
};

/* ── 에디터 블록 타입 ── */
// { id, type: "text"|"image"|"video"|"file", ... }

let _id = 0;
const uid = () => ++_id;
const textBlock  = (content="") => ({ id:uid(), type:"text", content });
const imageBlock = (url,name,size) => ({ id:uid(), type:"image", url, name, size, caption:"" });
const videoBlock = (url,name,size) => ({ id:uid(), type:"video", url, name, size, caption:"" });
const fileBlock  = (url,name,size,mime) => ({ id:uid(), type:"file", url, name, size, mime });

/* ════════════════════════════════════════════
   RICH EDITOR
════════════════════════════════════════════ */
function RichEditor({ blocks, setBlocks }) {
  const imgRef  = useRef();
  const vidRef  = useRef();
  const fileRef = useRef();

  const addBlock = (after, newBlock) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === after);
      const next = [...prev];
      next.splice(idx+1, 0, newBlock);
      return next;
    });
  };

  const updateBlock = (id, patch) =>
    setBlocks(prev => prev.map(b => b.id===id ? {...b,...patch} : b));

  const removeBlock = (id) =>
    setBlocks(prev => prev.length > 1 ? prev.filter(b=>b.id!==id) : prev);

  const moveBlock = (id, dir) => {
    setBlocks(prev => {
      const i = prev.findIndex(b=>b.id===id);
      const j = i+dir;
      if (j<0||j>=prev.length) return prev;
      const n=[...prev];
      [n[i],n[j]]=[n[j],n[i]];
      return n;
    });
  };

  const handleDrop = (e, afterId) => {
    e.preventDefault();
    const flist = Array.from(e.dataTransfer.files);
    if (!flist.length) return;
    let last = afterId;
    flist.forEach(f => {
      const url = URL.createObjectURL(f);
      let nb;
      if (f.type.startsWith("image/")) nb = imageBlock(url,f.name,f.size);
      else if (f.type.startsWith("video/")) nb = videoBlock(url,f.name,f.size);
      else nb = fileBlock(url,f.name,f.size,f.type);
      addBlock(last, nb);
      last = nb.id;
    });
  };

  /* 툴바 핸들러 */
  const [activeBar, setActiveBar] = useState(null); // 현재 포커스된 블록 id
  const [pendingInsert, setPendingInsert] = useState(null);

  const openImg  = (id) => { setPendingInsert({id,type:"image"}); imgRef.current.click(); };
  const openVid  = (id) => { setPendingInsert({id,type:"video"}); vidRef.current.click(); };
  const openFile = (id) => { setPendingInsert({id,type:"file"});  fileRef.current.click(); };
  const insertText = (id) => addBlock(id, textBlock());

  const handleFileChosen = (e) => {
    if (!pendingInsert) return;
    Array.from(e.target.files).forEach((f, fi) => {
      const url = URL.createObjectURL(f);
      let nb;
      if (pendingInsert.type==="image") nb = imageBlock(url,f.name,f.size);
      else if (pendingInsert.type==="video") nb = videoBlock(url,f.name,f.size);
      else nb = fileBlock(url,f.name,f.size,f.type);
      const after = fi===0 ? pendingInsert.id : blocks[blocks.length-1]?.id ?? pendingInsert.id;
      addBlock(fi===0 ? pendingInsert.id : after, nb);
    });
    e.target.value="";
    setPendingInsert(null);
  };

  return (
    <div className="rich-editor">
      {/* hidden inputs */}
      <input ref={imgRef}  type="file" accept="image/*"  multiple style={{display:"none"}} onChange={handleFileChosen}/>
      <input ref={vidRef}  type="file" accept="video/*"  multiple style={{display:"none"}} onChange={handleFileChosen}/>
      <input ref={fileRef} type="file" multiple style={{display:"none"}} onChange={handleFileChosen}/>

      {blocks.map((block, idx) => (
        <div
          key={block.id}
          className={`editor-block${activeBar===block.id?" active":""}`}
          onDragOver={e=>e.preventDefault()}
          onDrop={e=>handleDrop(e,block.id)}
        >
          {/* 블록 컨트롤 */}
          <div className="block-controls">
            <button className="bc-btn" title="위로" onClick={()=>moveBlock(block.id,-1)} disabled={idx===0}>↑</button>
            <button className="bc-btn" title="아래로" onClick={()=>moveBlock(block.id,1)} disabled={idx===blocks.length-1}>↓</button>
            <button className="bc-btn del" title="삭제" onClick={()=>removeBlock(block.id)}>✕</button>
          </div>

          {/* TEXT */}
          {block.type==="text" && (
            <div>
              <textarea
                className="editor-textarea"
                placeholder="내용을 입력하세요... (이미지/동영상은 아래 툴바에서 삽입)"
                value={block.content}
                onChange={e=>updateBlock(block.id,{content:e.target.value})}
                onFocus={()=>setActiveBar(block.id)}
                rows={4}
              />
              {/* 인라인 툴바 */}
              <div className={`inline-toolbar${activeBar===block.id?" show":""}`}>
                <span className="tb-label">삽입:</span>
                <button className="tb-btn" onClick={()=>openImg(block.id)}>🖼️ 이미지</button>
                <button className="tb-btn" onClick={()=>openVid(block.id)}>🎬 동영상</button>
                <button className="tb-btn" onClick={()=>openFile(block.id)}>📎 파일</button>
                <button className="tb-btn" onClick={()=>insertText(block.id)}>✏️ 텍스트</button>
              </div>
            </div>
          )}

          {/* IMAGE */}
          {block.type==="image" && (
            <div className="media-block">
              <div className="img-wrap">
                <img src={block.url} alt={block.name} className="preview-img"/>
                <div className="media-overlay">
                  <button className="ov-btn" onClick={()=>openImg(block.id)}>🔄 교체</button>
                </div>
              </div>
              <input
                className="caption-input"
                placeholder="사진 설명 (선택)"
                value={block.caption}
                onChange={e=>updateBlock(block.id,{caption:e.target.value})}
              />
              <div className="inline-toolbar show" style={{marginTop:6}}>
                <span className="tb-label">이 아래에 삽입:</span>
                <button className="tb-btn" onClick={()=>openImg(block.id)}>🖼️ 이미지</button>
                <button className="tb-btn" onClick={()=>openVid(block.id)}>🎬 동영상</button>
                <button className="tb-btn" onClick={()=>openFile(block.id)}>📎 파일</button>
                <button className="tb-btn" onClick={()=>insertText(block.id)}>✏️ 텍스트</button>
              </div>
            </div>
          )}

          {/* VIDEO */}
          {block.type==="video" && (
            <div className="media-block">
              <video src={block.url} controls className="preview-video"/>
              <input
                className="caption-input"
                placeholder="동영상 설명 (선택)"
                value={block.caption}
                onChange={e=>updateBlock(block.id,{caption:e.target.value})}
              />
              <div className="inline-toolbar show" style={{marginTop:6}}>
                <span className="tb-label">이 아래에 삽입:</span>
                <button className="tb-btn" onClick={()=>openImg(block.id)}>🖼️ 이미지</button>
                <button className="tb-btn" onClick={()=>openVid(block.id)}>🎬 동영상</button>
                <button className="tb-btn" onClick={()=>openFile(block.id)}>📎 파일</button>
                <button className="tb-btn" onClick={()=>insertText(block.id)}>✏️ 텍스트</button>
              </div>
            </div>
          )}

          {/* FILE */}
          {block.type==="file" && (
            <div className="file-block">
              <span className="fb-icon">{fileIcon(block.mime)}</span>
              <div className="fb-info">
                <div className="fb-name">{block.name}</div>
                <div className="fb-size">{fmtSize(block.size)}</div>
              </div>
              <div className="inline-toolbar show" style={{marginLeft:"auto"}}>
                <button className="tb-btn" onClick={()=>openImg(block.id)}>🖼️</button>
                <button className="tb-btn" onClick={()=>openVid(block.id)}>🎬</button>
                <button className="tb-btn" onClick={()=>openFile(block.id)}>📎</button>
                <button className="tb-btn" onClick={()=>insertText(block.id)}>✏️</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* 드롭존 안내 */}
      <div className="drop-hint">파일을 여기에 드래그 &amp; 드롭하여 삽입할 수 있습니다</div>
    </div>
  );
}

/* ════════════════════════════════════════════
   DETAIL VIEW
════════════════════════════════════════════ */
function DetailView({ post, onBack }) {
  const [lightbox, setLightbox] = useState(null);
  return (
    <div className="page">
      {lightbox && (
        <div className="lightbox" onClick={()=>setLightbox(null)}>
          <img src={lightbox} alt="preview"/>
          <button className="lb-close">✕</button>
        </div>
      )}
      <div className="page-header">
        <button className="back-btn" onClick={onBack}>← 목록</button>
        <h2 className="page-title">게시글 <span>보기</span></h2>
      </div>
      <div className="card">
        <div className="detail-title">{post.title}</div>
        <div className="detail-meta">
          <span>✍️ {post.author}</span>
          <span>📅 {post.date}</span>
          <span>👁 {post.views}</span>
        </div>
        <div className="detail-body">
          {post.blocks.map(block => (
            <div key={block.id} className="view-block">
              {block.type==="text" && block.content && (
                <p className="view-text">{block.content}</p>
              )}
              {block.type==="image" && (
                <div className="view-media">
                  <img
                    src={block.url}
                    alt={block.name}
                    className="view-img"
                    onClick={()=>setLightbox(block.url)}
                    title="클릭하여 크게 보기"
                  />
                  {block.caption && <div className="view-caption">{block.caption}</div>}
                </div>
              )}
              {block.type==="video" && (
                <div className="view-media">
                  <video src={block.url} controls className="view-video"/>
                  {block.caption && <div className="view-caption">{block.caption}</div>}
                </div>
              )}
              {block.type==="file" && (
                <a href={block.url} download={block.name} className="view-file">
                  <span>{fileIcon(block.mime)}</span>
                  <div>
                    <div className="fb-name">{block.name}</div>
                    <div className="fb-size">{fmtSize(block.size)} · 클릭하여 다운로드</div>
                  </div>
                  <span style={{marginLeft:"auto",color:"#c0602a"}}>↓</span>
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   MAIN APP
════════════════════════════════════════════ */
export default function App() {
  const [posts, setPosts]   = useState([]);
  const [view, setView]     = useState("board"); // board|step1|step2|detail
  const [step1, setStep1]   = useState({title:"",author:""});
  const [blocks, setBlocks] = useState([textBlock()]);
  const [selected, setSel]  = useState(null);

  const reset = () => {
    setStep1({title:"",author:""});
    setBlocks([textBlock()]);
    setView("board");
  };

  const submit = () => {
    const hasContent = blocks.some(b =>
      (b.type==="text" && b.content.trim()) || b.type==="image" || b.type==="video" || b.type==="file"
    );
    if (!hasContent) return;
    const p = {
      id: Date.now(),
      title: step1.title,
      author: step1.author||"익명",
      date: fmtDate(),
      blocks,
      views: 0,
      hasMedia: blocks.some(b=>b.type==="image"||b.type==="video"),
      fileCount: blocks.filter(b=>b.type==="file").length,
    };
    setPosts(prev=>[p,...prev]);
    reset();
  };

  const openPost = (p) => {
    setPosts(prev=>prev.map(x=>x.id===p.id?{...x,views:x.views+1}:x));
    setSel({...p,views:p.views+1});
    setView("detail");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        :root{
          --bg:#f5f0e8; --card:#fffdf8; --border:#e0d5c5;
          --ink:#2a1f14; --muted:#9a8c7e; --accent:#c0602a; --accent2:#8a3d15;
          --hover:#fdf6ec;
        }
        body{background:var(--bg);min-height:100vh;}
        .wrap{min-height:100vh;background:var(--bg);font-family:'Noto Sans KR',sans-serif;padding:44px 16px 100px;}

        /* HEADER */
        .header{text-align:center;margin-bottom:36px;}
        .header-label{font-family:'Nanum Myeongjo',serif;font-size:11px;letter-spacing:6px;color:var(--muted);margin-bottom:10px;}
        .header-title{font-family:'Nanum Myeongjo',serif;font-size:clamp(28px,5vw,46px);font-weight:800;color:var(--ink);letter-spacing:-1px;}
        .header-title span{color:var(--accent);}
        .header-bar{width:44px;height:3px;background:var(--accent);margin:14px auto 0;border-radius:2px;}

        /* BOARD */
        .container{max-width:820px;margin:0 auto;}
        .meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding:0 2px;}
        .meta-count{font-size:13px;color:var(--muted);} .meta-count strong{color:var(--accent);font-weight:600;}
        .table{background:var(--card);border:1.5px solid var(--border);border-radius:2px;overflow:hidden;box-shadow:4px 4px 0 var(--border);}
        .table-head{display:grid;grid-template-columns:50px 1fr 80px 90px 56px;padding:10px 20px;background:var(--ink);color:var(--bg);font-size:11px;letter-spacing:2px;}
        .tr{display:grid;grid-template-columns:50px 1fr 80px 90px 56px;padding:14px 20px;border-bottom:1px solid var(--border);align-items:center;cursor:pointer;transition:background .12s;}
        .tr:last-child{border-bottom:none;} .tr:hover{background:var(--hover);}
        .cn{font-size:12px;color:#b0a090;}
        .ct{font-size:14px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:10px;}
        .ct .badge{display:inline-block;font-size:9px;background:var(--accent);color:#fff;border-radius:2px;padding:1px 5px;margin-left:5px;vertical-align:middle;position:relative;top:-1px;}
        .ca,.cd,.cv{font-size:12px;color:var(--muted);} .cv{text-align:right;}
        .empty{padding:72px 20px;text-align:center;color:#b0a090;font-size:14px;line-height:2.2;}
        .empty-icon{font-size:36px;display:block;margin-bottom:8px;}

        /* FAB */
        .fab{position:fixed;bottom:32px;right:32px;width:56px;height:56px;background:var(--accent);border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 18px rgba(192,96,42,.45),3px 3px 0 var(--accent2);transition:transform .15s,box-shadow .15s;z-index:100;}
        .fab:hover{transform:translateY(-2px) scale(1.05);box-shadow:0 7px 24px rgba(192,96,42,.5),3px 5px 0 var(--accent2);}
        .fab svg{width:22px;height:22px;fill:#fff;}

        /* PAGE */
        .page{max-width:820px;margin:0 auto;}
        .page-header{display:flex;align-items:center;gap:12px;margin-bottom:28px;}
        .back-btn{background:none;border:1.5px solid var(--border);border-radius:2px;padding:8px 14px;font-size:12px;color:var(--muted);cursor:pointer;font-family:'Noto Sans KR',sans-serif;transition:all .15s;}
        .back-btn:hover{border-color:var(--ink);color:var(--ink);}
        .page-title{font-family:'Nanum Myeongjo',serif;font-size:21px;font-weight:800;color:var(--ink);}
        .page-title span{color:var(--accent);}
        .step-indicator{margin-left:auto;font-size:11px;letter-spacing:2px;color:var(--muted);}
        .card{background:var(--card);border:1.5px solid var(--border);border-radius:2px;padding:30px;box-shadow:4px 4px 0 var(--border);}

        .fl{display:block;font-size:11px;letter-spacing:2px;color:var(--muted);font-weight:500;margin-bottom:6px;}
        .fi{width:100%;padding:11px 14px;border:1.5px solid var(--border);background:var(--bg);border-radius:2px;font-size:14px;font-family:'Noto Sans KR',sans-serif;color:var(--ink);outline:none;transition:border-color .15s;margin-bottom:18px;}
        .fi:focus{border-color:var(--accent);background:var(--card);}
        .fi::placeholder{color:#c0b0a0;}
        .actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px;}
        .btn-c{padding:10px 20px;border:1.5px solid var(--border);background:transparent;border-radius:2px;font-size:13px;color:var(--muted);cursor:pointer;font-family:'Noto Sans KR',sans-serif;transition:all .15s;}
        .btn-c:hover{border-color:var(--ink);color:var(--ink);}
        .btn-p{padding:10px 24px;border:none;background:var(--accent);color:#fff;border-radius:2px;font-size:13px;font-weight:500;cursor:pointer;font-family:'Noto Sans KR',sans-serif;box-shadow:2px 2px 0 var(--accent2);transition:all .15s;}
        .btn-p:hover:not(:disabled){background:#a84e20;transform:translateY(-1px);}
        .btn-p:disabled{opacity:.38;cursor:not-allowed;}

        /* RICH EDITOR */
        .rich-editor{display:flex;flex-direction:column;gap:0;}
        .editor-block{position:relative;border:1.5px solid transparent;border-radius:3px;transition:border-color .15s;padding:6px 4px;}
        .editor-block:hover,.editor-block.active{border-color:var(--border);background:#fdfaf5;}
        .block-controls{position:absolute;top:6px;right:6px;display:flex;gap:4px;opacity:0;transition:opacity .15s;z-index:10;}
        .editor-block:hover .block-controls{opacity:1;}
        .bc-btn{background:var(--bg);border:1px solid var(--border);border-radius:2px;width:24px;height:24px;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--muted);transition:all .12s;}
        .bc-btn:hover{background:var(--card);color:var(--ink);}
        .bc-btn.del:hover{background:#fee;color:#c0392b;border-color:#c0392b;}
        .bc-btn:disabled{opacity:.3;cursor:not-allowed;}

        .editor-textarea{width:100%;padding:12px 14px;border:1.5px solid var(--border);background:var(--bg);border-radius:2px;font-size:14px;font-family:'Noto Sans KR',sans-serif;color:var(--ink);outline:none;resize:vertical;min-height:100px;line-height:1.75;transition:border-color .15s;}
        .editor-textarea:focus{border-color:var(--accent);background:var(--card);}
        .editor-textarea::placeholder{color:#c0b0a0;}

        .inline-toolbar{display:flex;align-items:center;gap:6px;padding:6px 8px;background:#f5f0e8;border:1px solid var(--border);border-radius:2px;margin-top:4px;opacity:0;pointer-events:none;transition:opacity .2s;flex-wrap:wrap;}
        .inline-toolbar.show{opacity:1;pointer-events:all;}
        .tb-label{font-size:10px;letter-spacing:1px;color:var(--muted);margin-right:2px;}
        .tb-btn{background:var(--card);border:1px solid var(--border);border-radius:2px;padding:4px 10px;font-size:12px;cursor:pointer;color:var(--ink);font-family:'Noto Sans KR',sans-serif;transition:all .12s;white-space:nowrap;}
        .tb-btn:hover{background:var(--accent);color:#fff;border-color:var(--accent);}

        /* MEDIA BLOCKS */
        .media-block{display:flex;flex-direction:column;gap:6px;}
        .img-wrap{position:relative;display:inline-block;max-width:100%;}
        .preview-img{max-width:100%;max-height:480px;display:block;border-radius:2px;border:1px solid var(--border);}
        .preview-video{width:100%;max-height:400px;border-radius:2px;border:1px solid var(--border);}
        .media-overlay{position:absolute;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s;border-radius:2px;}
        .img-wrap:hover .media-overlay{opacity:1;}
        .ov-btn{background:#fff;border:none;border-radius:2px;padding:6px 14px;font-size:12px;cursor:pointer;font-family:'Noto Sans KR',sans-serif;}
        .caption-input{width:100%;padding:7px 10px;border:1px solid var(--border);background:transparent;border-radius:2px;font-size:12px;font-family:'Noto Sans KR',sans-serif;color:var(--muted);outline:none;text-align:center;}
        .caption-input:focus{border-color:var(--accent);}
        .caption-input::placeholder{color:#c0b0a0;}

        .file-block{display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--bg);border:1.5px solid var(--border);border-radius:2px;}
        .fb-icon{font-size:22px;}
        .fb-info{flex:1;min-width:0;}
        .fb-name{font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .fb-size{font-size:11px;color:var(--muted);margin-top:2px;}

        .drop-hint{text-align:center;font-size:11px;color:#c0b0a0;letter-spacing:1px;padding:16px;border:1.5px dashed #d5c9b8;border-radius:2px;margin-top:12px;}

        /* DETAIL */
        .detail-title{font-family:'Nanum Myeongjo',serif;font-size:22px;font-weight:800;color:var(--ink);margin-bottom:12px;line-height:1.3;}
        .detail-meta{display:flex;gap:18px;font-size:12px;color:var(--muted);padding-bottom:16px;border-bottom:1.5px solid var(--border);margin-bottom:24px;flex-wrap:wrap;}
        .detail-body{display:flex;flex-direction:column;gap:0;}
        .view-block{margin-bottom:18px;}
        .view-text{font-size:14px;color:var(--ink);line-height:1.85;white-space:pre-wrap;}
        .view-media{display:flex;flex-direction:column;align-items:flex-start;gap:6px;}
        .view-img{max-width:100%;border-radius:3px;cursor:pointer;transition:opacity .15s;border:1px solid var(--border);}
        .view-img:hover{opacity:.92;}
        .view-video{width:100%;max-height:440px;border-radius:3px;border:1px solid var(--border);}
        .view-caption{font-size:12px;color:var(--muted);text-align:center;width:100%;font-style:italic;}
        .view-file{display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--bg);border:1.5px solid var(--border);border-radius:2px;text-decoration:none;cursor:pointer;transition:background .12s;}
        .view-file:hover{background:var(--hover);}

        /* LIGHTBOX */
        .lightbox{position:fixed;inset:0;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;z-index:999;cursor:zoom-out;}
        .lightbox img{max-width:92vw;max-height:90vh;border-radius:3px;object-fit:contain;}
        .lb-close{position:absolute;top:20px;right:24px;background:none;border:none;color:#fff;font-size:26px;cursor:pointer;}

        /* title preview strip */
        .title-strip{padding:10px 14px;background:var(--bg);border-radius:2px;border-left:3px solid var(--accent);margin-bottom:18px;}
        .ts-label{font-size:10px;letter-spacing:2px;color:var(--muted);margin-bottom:3px;}
        .ts-val{font-size:14px;font-weight:500;color:var(--ink);}

        @media(max-width:540px){
          .table-head{grid-template-columns:38px 1fr 58px;}
          .table-head .ha,.table-head .hv{display:none;}
          .tr{grid-template-columns:38px 1fr 58px;}
          .ca,.cv{display:none;}
          .card{padding:20px 16px;}
          .fab{bottom:22px;right:18px;}
        }
      `}</style>

      <div className="wrap">
        <div className="header">
          <p className="header-label">Community Board</p>
          <h1 className="header-title">자유 <span>게시판</span></h1>
          <div className="header-bar"/>
        </div>

        {/* ── BOARD ── */}
        {view==="board" && (
          <div className="container">
            <div className="meta">
              <p className="meta-count">전체 <strong>{posts.length}</strong>개</p>
            </div>
            <div className="table">
              <div className="table-head">
                <span>번호</span><span>제목</span>
                <span className="ha">작성자</span><span>날짜</span>
                <span className="hv" style={{textAlign:"right"}}>조회</span>
              </div>
              {posts.length===0 ? (
                <div className="empty">
                  <span className="empty-icon">📋</span>
                  아직 게시글이 없습니다.<br/>
                  <strong style={{color:"var(--accent)"}}>+</strong> 버튼을 눌러 첫 글을 작성해보세요!
                </div>
              ) : posts.map((p,i)=>(
                <div className="tr" key={p.id} onClick={()=>openPost(p)}>
                  <span className="cn">{posts.length-i}</span>
                  <span className="ct">
                    {p.title}
                    {p.hasMedia && <span className="badge">🖼️</span>}
                    {p.fileCount>0 && <span className="badge">📎{p.fileCount}</span>}
                  </span>
                  <span className="ca">{p.author}</span>
                  <span className="cd">{p.date}</span>
                  <span className="cv">{p.views}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 1 ── */}
        {view==="step1" && (
          <div className="page">
            <div className="page-header">
              <button className="back-btn" onClick={reset}>← 목록</button>
              <h2 className="page-title">글쓰기 <span>1단계</span></h2>
              <span className="step-indicator">STEP 1 / 2</span>
            </div>
            <div className="card">
              <label className="fl">TITLE · 제목 *</label>
              <input className="fi" type="text" placeholder="게시글 제목을 입력하세요" value={step1.title}
                onChange={e=>setStep1(s=>({...s,title:e.target.value}))} autoFocus maxLength={80}
                onKeyDown={e=>e.key==="Enter"&&step1.title.trim()&&setView("step2")}/>
              <label className="fl">AUTHOR · 작성자</label>
              <input className="fi" type="text" placeholder="이름 (미입력 시 익명)" value={step1.author}
                onChange={e=>setStep1(s=>({...s,author:e.target.value}))} maxLength={20}
                onKeyDown={e=>e.key==="Enter"&&step1.title.trim()&&setView("step2")}
                style={{marginBottom:0}}/>
              <div className="actions">
                <button className="btn-c" onClick={reset}>취소</button>
                <button className="btn-p" disabled={!step1.title.trim()} onClick={()=>setView("step2")}>다음 →</button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {view==="step2" && (
          <div className="page">
            <div className="page-header">
              <button className="back-btn" onClick={()=>setView("step1")}>← 이전</button>
              <h2 className="page-title">글쓰기 <span>2단계</span></h2>
              <span className="step-indicator">STEP 2 / 2</span>
            </div>
            <div className="card">
              <div className="title-strip">
                <div className="ts-label">TITLE</div>
                <div className="ts-val">{step1.title}</div>
              </div>
              <label className="fl">CONTENT · 본문 편집</label>
              <RichEditor blocks={blocks} setBlocks={setBlocks}/>
              <div className="actions">
                <button className="btn-c" onClick={reset}>취소</button>
                <button className="btn-p"
                  disabled={!blocks.some(b=>(b.type==="text"&&b.content.trim())||b.type==="image"||b.type==="video"||b.type==="file")}
                  onClick={submit}>게시하기 ✓</button>
              </div>
            </div>
          </div>
        )}

        {/* ── DETAIL ── */}
        {view==="detail" && selected && (
          <DetailView post={selected} onBack={()=>setView("board")}/>
        )}
      </div>

      {view==="board" && (
        <button className="fab" onClick={()=>setView("step1")} title="글쓰기">
          <svg viewBox="0 0 24 24"><path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>
        </button>
      )}
    </>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase'
import {
  X, CheckCircle, XCircle, Calendar, Clock, MapPin,
  Phone, Mail, Camera, ChevronLeft, ChevronRight,
  Loader2, Shield, Briefcase, Tag, AlertTriangle, Zap,
  ImagePlus, Trash2, Upload, MessageSquare, RefreshCw,
  CalendarClock, Copy
} from 'lucide-react'

function TaskRefBadge({ id }) {
  const [copied, setCopied] = useState(false)
  if (!id) return null
  const ref = '#' + id.replace(/-/g, '').slice(0, 7).toUpperCase()
  const copy = (e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(ref).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} title="Copiază referința"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 hover:bg-blue-50 hover:border-blue-200 border border-gray-200 text-gray-500 hover:text-blue-600 rounded-lg text-xs font-mono font-bold transition-all">
      {copied ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
      {copied ? <span className="text-green-600">Copiat!</span> : ref}
    </button>
  )
}

const ROMANIAN_WORDS = ['ALBASTRU','RAPID','CERUL','VERDE','STEJAR','MUNTE','FULGER','ROATA','FLUTURE','CASA','DRUM','PIATRA']
const TIME_SLOTS = [
  '07:00','07:30','08:00','08:30','09:00','09:30',
  '10:00','10:30','11:00','11:30','12:00','12:30',
  '13:00','13:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30','18:00','18:30','19:00',
]
const JRM_TODAY = new Date().toISOString().split('T')[0]
const jrmToMins = t => { const [h, m] = t.split(':'); return parseInt(h) * 60 + parseInt(m) }
const jrmAvail  = (date) => {
  if (date !== JRM_TODAY) return TIME_SLOTS
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
  return TIME_SLOTS.filter(t => jrmToMins(t) > nowMins)
}
const CONFIRM_WORD = 'ACCEPT'
const DURATION_OPTIONS = ['30 minute', '1 oră', '1-2 ore', '2-3 ore', '3-4 ore', '4-6 ore', '6-8 ore', '1 zi', 'Peste 1 zi']

function randomPhrase() {
  const w1 = ROMANIAN_WORDS[Math.floor(Math.random()*ROMANIAN_WORDS.length)]
  const w2 = ROMANIAN_WORDS[Math.floor(Math.random()*ROMANIAN_WORDS.length)]
  const num = Array.from({length:3},()=>Math.floor(Math.random()*10)).join('')
  return `${w1}-${w2}-${num}`
}
function fmtDate(d,t){if(!d)return null;try{const x=new Date(d);const l=x.toLocaleDateString('ro-RO',{day:'2-digit',month:'long',year:'numeric'});return t?`${l} · ${t}`:l}catch{return d}}

function PhotoGallery({photos}){
  const [active,setActive]=useState(0)
  if(!photos?.length)return(<div className="h-28 rounded-xl bg-gray-50 border border-dashed border-gray-200 flex flex-col items-center justify-center gap-1.5"><Camera className="w-6 h-6 text-gray-300"/><p className="text-xs text-gray-400">Nu există poze atașate</p></div>)
  return(<div className="space-y-2"><div className="relative rounded-xl overflow-hidden bg-gray-100 h-48"><img src={photos[active]} alt="" className="w-full h-full object-cover" onError={e=>{e.currentTarget.src=''}}/>{photos.length>1&&<><button onClick={()=>setActive(i=>Math.max(0,i-1))} disabled={active===0} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center disabled:opacity-30 hover:bg-black/60 transition"><ChevronLeft className="w-4 h-4"/></button><button onClick={()=>setActive(i=>Math.min(photos.length-1,i+1))} disabled={active===photos.length-1} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center disabled:opacity-30 hover:bg-black/60 transition"><ChevronRight className="w-4 h-4"/></button><div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">{active+1} / {photos.length}</div></>}</div>{photos.length>1&&<div className="flex gap-2 overflow-x-auto pb-1">{photos.map((url,i)=><button key={i} onClick={()=>setActive(i)} className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition ${i===active?'border-blue-500':'border-transparent'}`}><img src={url} alt="" className="w-full h-full object-cover"/></button>)}</div>}</div>)
}

function TypeBadge({type}){if(type==='task')return<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200"><Briefcase className="w-3 h-3"/>Task</span>;return<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 border border-teal-200"><Tag className="w-3 h-3"/>Rezervare</span>}
function UrgencyBadge({urgency}){const map={high:{label:'Urgent',cls:'bg-red-100 text-red-700 border-red-200',Icon:AlertTriangle},medium:{label:'Mediu',cls:'bg-yellow-100 text-yellow-700 border-yellow-200',Icon:Zap},normal:{label:'Normal',cls:'bg-green-100 text-green-700 border-green-200',Icon:Clock},low:{label:'Normal',cls:'bg-green-100 text-green-700 border-green-200',Icon:Clock}};const{label,cls,Icon}=map[urgency]??map.normal;return<span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}><Icon className="w-3 h-3"/>{label}</span>}

function RobotCheckbox({onVerified}){
  const [state,setState]=useState('idle')
  const handle=()=>{if(state!=='idle')return;setState('spinning');setTimeout(()=>{setState('done');setTimeout(onVerified,400)},1600)}
  return(<div className="border border-gray-200 rounded-xl p-4 bg-gray-50 flex items-center justify-between"><div className="flex items-center gap-3"><div onClick={handle} className={`w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${state==='idle'?'border-gray-400 bg-white hover:border-blue-500':''} ${state==='spinning'?'border-blue-500 bg-white':''} ${state==='done'?'border-green-500 bg-green-500':''}`}>{state==='spinning'&&<svg className="w-4 h-4 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeLinecap="round"/></svg>}{state==='done'&&<CheckCircle className="w-4 h-4 text-white"/>}</div><span className="text-sm text-gray-700 font-medium">Nu sunt robot</span></div><div className="flex flex-col items-end"><div className="flex items-center gap-1 text-xs text-gray-400"><Shield className="w-3 h-3"/>reCAPTCHA</div><span className="text-[10px] text-gray-300">Confidențialitate · Termeni</span></div></div>)
}

function ProgressDots({mode}){
  const steps=[{id:'c1',label:'Verificare'},{id:'c2',label:'Confirmare'},{id:'c3',label:'Dovadă'}]
  const activeIdx=steps.findIndex(s=>s.id===mode)
  return(<div className="flex items-center justify-center gap-6 mb-2">{steps.map((step,i)=><div key={step.id} className="flex flex-col items-center gap-1"><div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i<activeIdx?'bg-green-500 text-white':''} ${i===activeIdx?'bg-blue-600 text-white ring-4 ring-blue-100':''} ${i>activeIdx?'bg-gray-100 text-gray-400':''}`}>{i<activeIdx?<CheckCircle className="w-4 h-4"/>:i+1}</div><span className={`text-[10px] font-medium ${i===activeIdx?'text-blue-600':'text-gray-400'}`}>{step.label}</span></div>)}</div>)
}

export default function JobRequestModal({job,initialMode='details',userId,handymanName,onClose,onUpdate}){
  const navigate=useNavigate()
  const [mode,setMode]=useState('details')
  const [client,setClient]=useState(null)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState(null)
  const [confirmText,setConfirmText]=useState('')
  const [reschedDate,setReschedDate]=useState('')
  const [reschedTime,setReschedTime]=useState('')
  const [reschedMessage,setReschedMessage]=useState('')
  const [pendingResched,setPendingResched]=useState(null)
  const [scheduleDate,setScheduleDate]=useState(job._raw.scheduled_date??'')
  const [scheduleTime,setScheduleTime]=useState(job._raw.scheduled_time??'')
  const [estimatedDuration,setEstimatedDuration]=useState(job._raw.approximate_duration??'')
  const [delayReason,setDelayReason]=useState('')
  const [phrase]=useState(()=>randomPhrase())
  const [phraseInput,setPhraseInput]=useState('')
  const [phraseError,setPhraseError]=useState(false)
  const [compPhotos,setCompPhotos]=useState([])
  const [compDesc,setCompDesc]=useState('')
  const [uploadProgress,setUploadProgress]=useState(false)
  const fileInputRef=useRef(null)

  useEffect(()=>{
    if(initialMode==='complete')setMode('c1')
    else if(initialMode==='decline')setMode('decline_confirm')
    else if(initialMode==='reschedule')setMode('reschedule')
    else setMode('details')
  },[initialMode])

  useEffect(()=>{
    if(!job.clientId)return
    supabase.from('profiles').select('id,first_name,last_name,avatar_url,phone,city,county').eq('id',job.clientId).maybeSingle().then(({data})=>setClient(data??null))
  },[job.clientId])

  useEffect(()=>{
    supabase.from('reschedule_requests').select('*').eq('job_id',job._id).in('status',['pending','pending_client','pending_handyman']).order('created_at',{ascending:false}).limit(1).maybeSingle().then(({data})=>setPendingResched(data??null))
  },[job._id])

  const clientName=client?`${client.first_name??''} ${client.last_name??''}`.trim()||job.client:job.client
  const clientPhone=client?.phone??job._raw.contact_phone??null
  const clientEmail=job._raw.contact_email??null
  const photos=job.photos??[]
  const canReschedule=['new','accepted'].includes(job.uiStatus)
  const isTask = job._type === 'task'
  const isDelayed = job.uiStatus === 'delayed'
  const delayReasonText = [
    job?._raw?.delay_reason,
    job?._raw?.handyman_delay_reason,
    job?._raw?.delay_message,
  ].find(v => typeof v === 'string' && v.trim()) || ''

  const handleAccept=async()=>{
    setSaving(true);setError(null)
    try{
      if(job._type==='booking'){await supabase.from('bookings').update({status:'accepted',scheduled_date:scheduleDate||undefined,scheduled_time:scheduleTime||undefined,updated_at:new Date().toISOString()}).eq('id',job._id)}
      else{await supabase.from('tasks').update({status:'assigned',handyman_id:userId,scheduled_date:scheduleDate||undefined,scheduled_time:scheduleTime||undefined,approximate_duration:estimatedDuration||null,updated_at:new Date().toISOString()}).eq('id',job._id)}
      if(job.clientId){
        const hmName = handymanName || 'un meșter'
        await supabase.from('notifications').insert({
          user_id:job.clientId,
          type: job._type==='booking' ? 'booking_confirmed' : 'task_allocated',
          title: job._type==='booking' ? 'Rezervare acceptată!' : 'Task alocat meșterului',
          body: job._type==='booking'
            ? `Rezervarea „${job.title}" a fost acceptată de ${hmName}.`
            : `Taskul „${job.title}" a fost alocat lui ${hmName}.`,
          data:{job_id:job._id,job_type:job._type,redirect:'/dashboard?tab=tasks'},
        })

        // Creare conversație automată dacă nu există deja
        const convField=job._type==='booking'?'booking_id':'task_id'
        const {data:existingConv}=await supabase.from('conversations').select('id').eq('handyman_id',userId).eq('client_id',job.clientId).eq(convField,job._id).maybeSingle()
        if(!existingConv){
          await supabase.from('conversations').insert({
            client_id:job.clientId,
            handyman_id:userId,
            [convField]:job._id,
          })
        }
      }
      setMode('accept_done')
    }catch(e){setError('A apărut o eroare.')}finally{setSaving(false)}
  }

  const handleMarkDelayed=async()=>{
    setSaving(true);setError(null)
    try{
      // Determine which RPC to call based on job type
      const rpcFunc = job._type === 'booking' ? 'mark_booking_delayed' : 'mark_task_delayed'
      const idParam = job._type === 'booking' ? 'p_booking_id' : 'p_task_id'
      
      // Call RPC with server-side validation + conflict detection
      const rpcParams = {
        [idParam]: job._id,
        p_delay_reason: delayReason?.trim() || null,
        p_user_id: userId
      }
      
      const {data,error:rpcError} = await supabase.rpc(rpcFunc, rpcParams)
      
      if(rpcError)throw rpcError
      if(data?.success===false){
        if(data.error_code==='UNAUTHORIZED')setError('Nu ești autorizat să marchezi această lucrare ca întârziată.')
        else if(data.error_code==='INVALID_STATE_TRANSITION')setError(`Nu poți marca ca întârziat din starea: ${job.uiStatus}`)
        else if(data.error_code==='TASK_NOT_FOUND' || data.error_code==='BOOKING_NOT_FOUND')setError('Lucrarea nu a fost găsită.')
        else setError(data.error||'Eroare server.')
        setSaving(false)
        return
      }

      // Check for scheduling conflicts (warning only)
      if(data?.warnings?.has_scheduling_conflict){
        setError('⚠️ Atenție: Ai alte lucrări active în aceeași perioadă. Verifică agenda.')
      }

      if(job.clientId){
        await supabase.from('notifications').insert({
          user_id:job.clientId,
          type:'new_offer',
          title:'Actualizare: lucrare întârziată',
          body:`„${job.title}" este marcat temporar ca întârziat. Poți reprograma sau anula din dashboard.`,
          data:{job_id:job._id,job_type:job._type,redirect:'/dashboard'},
        })
      }
      onUpdate?.()
    }catch(e){setError(`Nu am putut marca întârzierea: ${e.message}`)}finally{setSaving(false)}
  }

  const handleResumeFromDelay=async()=>{
    setSaving(true);setError(null)
    try{
      // Determine which RPC to call based on job type
      const rpcFunc = job._type === 'booking' ? 'resume_booking_from_delay' : 'resume_from_delay'
      const idParam = job._type === 'booking' ? 'p_booking_id' : 'p_task_id'
      
      // Call RPC with server-side validation
      const rpcParams = {
        [idParam]: job._id,
        p_user_id: userId
      }
      
      const {data,error:rpcError} = await supabase.rpc(rpcFunc, rpcParams)
      
      if(rpcError)throw rpcError
      if(data?.success===false){
        if(data.error_code==='UNAUTHORIZED')setError('Nu ești autorizat să relui această lucrare.')
        else if(data.error_code==='INVALID_STATE_TRANSITION')setError(`Nu poți relua din starea: ${job.uiStatus}. Lucrarea trebuie să fie în stare "Întârziat".`)
        else if(data.error_code==='TASK_NOT_FOUND' || data.error_code==='BOOKING_NOT_FOUND')setError('Lucrarea nu a fost găsită.')
        else setError(data.error||'Eroare server.')
        setSaving(false)
        return
      }

      if(job.clientId){
        await supabase.from('notifications').insert({
          user_id:job.clientId,
          type:'task_accepted',
          title:'Update: lucrarea a fost reluată',
          body:`„${job.title}" a revenit în starea "în progres".`,
          data:{job_id:job._id,job_type:job._type,redirect:'/dashboard'},
        })
      }
      onUpdate?.()
    }catch(e){setError(`Nu am putut relua lucrarea: ${e.message}`)}finally{setSaving(false)}
  }

  const handleDecline=async()=>{
    setSaving(true);setError(null)
    try{
      if(job._type==='booking'){await supabase.from('bookings').update({status:'cancelled',updated_at:new Date().toISOString()}).eq('id',job._id)}
      else{const cur=Array.isArray(job._raw.proposed_to)?job._raw.proposed_to:[];await supabase.from('tasks').update({proposed_to:cur.filter(id=>id!==userId),updated_at:new Date().toISOString()}).eq('id',job._id)}
      setMode('decline_done')
    }catch(e){setError('A apărut o eroare.')}finally{setSaving(false)}
  }

  const handleReschedule=async()=>{
    if(!reschedDate||!reschedTime){setError('Selectează data și ora.');return}
    setSaving(true);setError(null)
    try{
      await supabase.from('reschedule_requests').insert({job_id:job._id,job_type:job._type,handyman_id:userId,client_id:job.clientId,proposed_date:reschedDate,proposed_time:reschedTime,message:reschedMessage||null,status:'pending_client',created_at:new Date().toISOString()})
      if(job.clientId){
        await supabase.from('notifications').insert({
          user_id:job.clientId,
          type:'reschedule_request',
          title:'Cerere de reprogramare',
          body:`Meșteșugarul propune reprogramarea „${job.title}" pe ${reschedDate} la ${reschedTime}.`,
          data:{job_id:job._id,job_type:job._type,redirect:'/dashboard?tab=reschedule'},
        })
      }
      setMode('reschedule_done')
    }catch(e){setError('Eroare: '+(e.message??''))}finally{setSaving(false)}
  }

  const handlePhraseSubmit=()=>{if(phraseInput.trim().toUpperCase()!==phrase){setPhraseError(true);return};setPhraseError(false);setMode('c3')}
  const handleAddPhotos=(e)=>{const files=Array.from(e.target.files??[]);setCompPhotos(prev=>[...prev,...files.map(f=>({file:f,previewUrl:URL.createObjectURL(f)}))].slice(0,6));e.target.value=''}
  const handleRemovePhoto=(idx)=>{setCompPhotos(prev=>{URL.revokeObjectURL(prev[idx].previewUrl);return prev.filter((_,i)=>i!==idx)})}

  const handleCompleteJob=async()=>{
    if(compPhotos.length===0){setError('Trebuie să adaugi cel puțin o poză.');return}
    setSaving(true);setError(null);setUploadProgress(true)
    const isReworkCompletion = job._type === 'task' && job.isRework
    // For rework tasks, link completion to the original task so the client modal can find it
    const completionJobId = isReworkCompletion ? (job._raw?.task_id ?? job._id) : job._id
    try{
      const uploadedUrls=[]
      for(const{file}of compPhotos){const ext=file.name.split('.').pop();const path=`${userId}/${job._id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;const{error:upErr}=await supabase.storage.from('completion-photos').upload(path,file,{contentType:file.type});if(upErr)throw upErr;const{data:urlData}=supabase.storage.from('completion-photos').getPublicUrl(path);uploadedUrls.push(urlData.publicUrl)}
      await supabase.from('job_completions').insert({job_id:completionJobId,job_type:job._type,handyman_id:userId,completion_photos:uploadedUrls,completion_description:compDesc||null,...(job._type==='booking'?{booking_id:job._id}:{task_id:job._id})})
      const table=job._type==='booking'?'bookings':'tasks'
      const completedStatus = isReworkCompletion ? 'rework_completed' : 'completed'
      await supabase.from(table).update({status:completedStatus,completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',job._id)
      if (isReworkCompletion) {
        // Update the dispute so the client sees the rework_completed approval section
        await supabase.from('task_disputes')
          .update({ status: 'rework_completed', updated_at: new Date().toISOString() })
          .eq('task_id', completionJobId)
          .in('status', ['rework_accepted', 'rework_scheduled', 'rework_in_progress'])
      }
      if(job.clientId){
        await supabase.from('notifications').insert({
          user_id: job.clientId,
          type: 'service_completed',
          title: isReworkCompletion ? 'Relucrare finalizată' : 'Serviciu finalizat',
          body: isReworkCompletion
            ? `„${job.title}" — relucrarea a fost finalizată. Confirmă sau deschide o dispută.`
            : `„${job.title}" a fost marcat ca finalizat. Lasă o recenzie pentru meșteșugar!`,
          data: {
            job_id: job._id,
            job_type: job._type,
            is_rework: isReworkCompletion,
            redirect: isReworkCompletion
              ? '/dashboard?tab=tasks&filter=rework'
              : job._type === 'booking'
              ? '/dashboard?tab=bookings&bookingFilter=completed'
              : '/dashboard?tab=tasks&filter=completed',
          },
        })
      }
      // Notify admins when a rework is completed (so they can monitor client approval)
      if (isReworkCompletion) {
        try {
          const { data: roleRow } = await supabase.from('roles').select('id').eq('name','admin').single()
          if (roleRow?.id) {
            const { data: admins } = await supabase.from('user_roles').select('user_id').eq('role_id', roleRow.id)
            for (const { user_id } of (admins ?? [])) {
              await supabase.from('notifications').insert({
                user_id,
                type:  'rework_scheduled',
                title: 'Relucrare finalizată — așteptare aprobare client',
                body:  `„${job.title}" — relucrarea a fost marcată finalizată. Clientul urmează să confirme.`,
                data:  { job_id: job._id, redirect: '/admin/dashboard?tab=disputes' },
              })
            }
          }
        } catch(e) { console.warn('[JobRequest] admin notify error:', e?.message) }
      }
      // Închide conversația pentru bookings (la tasks o închide clientul la aprobare)
      if(job._type==='booking'){
        await supabase.from('conversations').update({is_closed:true}).eq('booking_id',job._id)
      }
      setMode('c4')
    }catch(e){setError('Eroare: '+(e.message??''))}finally{setSaving(false);setUploadProgress(false)}
  }

  const showHeader=!['accept_done','decline_done','c4','reschedule_done'].includes(mode)

  return(
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:px-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92dvh]" onClick={e=>e.stopPropagation()}>

        {showHeader&&(
          <div className="flex items-start justify-between p-5 border-b border-gray-100 flex-shrink-0">
            <div className="flex-1 min-w-0 pr-3">
              <div className="flex items-center gap-2 mb-0.5">
                <TypeBadge type={job._type}/>
                <UrgencyBadge urgency={job.urgency}/>
              </div>
              <h2 className="text-base font-bold text-gray-800 mt-1.5 leading-snug line-clamp-2">{job.title}</h2>
              <div className="flex items-center gap-2 mt-1.5">
                <p className="text-sm text-gray-500">{clientName}</p>
                <TaskRefBadge id={job._id} />
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center flex-shrink-0 ml-2"><X className="w-4 h-4 text-gray-400"/></button>
          </div>
        )}

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {error&&<div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

          {/* ── DETAILS ── */}
          {mode==='details'&&(
            <>
              <PhotoGallery photos={photos}/>
              {pendingResched&&(
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-2">
                  <CalendarClock className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5"/>
                  <div>
                    <p className="text-xs font-bold text-yellow-800">Cerere reprogramare în așteptare</p>
                    <p className="text-xs text-yellow-700 mt-0.5">{new Date(pendingResched.proposed_date).toLocaleDateString('ro-RO',{day:'2-digit',month:'long'})} · {pendingResched.proposed_time}</p>
                  </div>
                </div>
              )}
              {job.description&&<div className="bg-gray-50 rounded-xl p-4"><p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1.5">Descriere</p><p className="text-sm text-gray-700 leading-relaxed">{job.description}</p></div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-gray-100 rounded-xl p-3"><p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Programare</p><div className="flex items-center gap-1.5 text-sm text-gray-700"><Calendar className="w-3.5 h-3.5 text-gray-400"/><span>{job.date}</span></div></div>
                <div className="bg-white border border-gray-100 rounded-xl p-3"><p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Locație</p><div className="flex items-start gap-1.5 text-sm text-gray-700"><MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5"/><span>{job.address||'—'}</span></div></div>
              </div>
              {job.approximateDuration&&<div className="bg-white border border-gray-100 rounded-xl p-3"><p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Durată estimată</p><div className="flex items-center gap-1.5 text-sm text-gray-700"><Clock className="w-3.5 h-3.5 text-gray-400"/><span>{job.approximateDuration}</span></div></div>}
              {isDelayed&&(
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl space-y-1.5">
                  <p className="text-xs font-bold text-orange-800">Status întârziat</p>
                  <p className="text-xs text-orange-700">Clientul vede întârzierea și poate decide reprogramare sau anulare.</p>
                  {delayReasonText && (
                    <div className="pt-1 border-t border-orange-200">
                      <p className="text-[11px] font-bold text-orange-700 uppercase tracking-wide">Motiv întârziere</p>
                      <p className="text-xs text-orange-800 mt-0.5">{delayReasonText}</p>
                    </div>
                  )}
                </div>
              )}
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">Client</p>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm flex-shrink-0">{clientName.split(' ').filter(Boolean).map(n=>n[0]).join('').slice(0,2).toUpperCase()}</div>
                  <div><p className="font-semibold text-gray-800 text-sm">{clientName}</p>{client?.city&&<p className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3"/>{[client.city,client.county].filter(Boolean).join(', ')}</p>}</div>
                </div>
                <div className="space-y-1.5 text-sm text-gray-600">
                  {clientPhone&&<div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400"/><span>{clientPhone}</span></div>}
                  {clientEmail&&<div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-gray-400"/><span>{clientEmail}</span></div>}
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
                <span className="text-sm text-blue-700 font-medium">Buget client</span>
                <span className="text-xl font-bold text-blue-700">{job.price}</span>
              </div>
            </>
          )}

          {/* ── CONFIRM ACCEPT ── */}
          {mode==='confirm_accept'&&(
            <>
              <div className="text-center">
                <div className="w-14 h-14 bg-blue-50 border-2 border-blue-200 rounded-full flex items-center justify-center mx-auto mb-3"><CheckCircle className="w-7 h-7 text-blue-600"/></div>
                <h3 className="font-bold text-gray-800 text-lg">Confirmi acceptarea?</h3>
                <p className="text-sm text-gray-500 mt-1.5">Scrie <span className="font-black text-blue-700 tracking-widest">{CONFIRM_WORD}</span> pentru a confirma că ai citit detaliile și vrei să accepți.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
                <p className="font-semibold text-gray-700">{job.title}</p>
                <p className="text-gray-500">{clientName} · {job.price}</p>
              </div>
              <div>
                <input type="text" value={confirmText} onChange={e=>setConfirmText(e.target.value.toUpperCase())} placeholder={`Scrie ${CONFIRM_WORD}...`} maxLength={10}
                  className={`w-full px-4 py-3 border rounded-xl text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 uppercase ${confirmText===CONFIRM_WORD?'border-green-400 focus:ring-green-400 bg-green-50':'border-gray-300 focus:ring-blue-500'}`}/>
                {confirmText.length>0&&confirmText!==CONFIRM_WORD&&<p className="text-xs text-gray-400 text-center mt-1">Scrie exact: <strong className="text-blue-700">{CONFIRM_WORD}</strong></p>}
              </div>
            </>
          )}

          {/* ── SUMMARY ── */}
          {mode==='summary'&&(
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2"><CheckCircle className="w-5 h-5 text-green-600"/><h3 className="font-bold text-green-800">{job.title}</h3></div>
                <p className="text-sm text-green-700 mb-3">{clientName}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-green-600 text-xs">Buget</span><p className="font-bold text-green-800">{job.price}</p></div>
                  <div><span className="text-green-600 text-xs">Tip</span><p className="font-bold text-green-800">{job._type==='task'?'Task':'Rezervare'}</p></div>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/>Schimbă Data / Schimbă Ora</p>
                <p className="text-xs text-gray-400">Solicitată de client: <strong className="text-gray-600">{job.date}</strong></p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Data</label>
                    <input type="date" value={scheduleDate}
                      onChange={e => {
                        const d = e.target.value
                        setScheduleDate(d)
                        if (d === JRM_TODAY && scheduleTime && jrmToMins(scheduleTime) <= new Date().getHours() * 60 + new Date().getMinutes()) setScheduleTime('')
                      }}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Ora</label>
                    <select value={scheduleTime} onChange={e=>setScheduleTime(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                      <option value="">Selectează</option>
                      {jrmAvail(scheduleDate).map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                {isTask&&(
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Durată estimată lucrare</label>
                    <select value={estimatedDuration} onChange={e=>setEstimatedDuration(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                      <option value="">Selectează</option>
                      {DURATION_OPTIONS.map(d=><option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── ACCEPT DONE ── */}
          {mode==='accept_done'&&(
            <div className="text-center space-y-5 py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle className="w-9 h-9 text-green-600"/></div>
              <div><h2 className="text-xl font-bold text-gray-800">Job Acceptat!</h2><p className="text-sm text-gray-500 mt-2">Clientul va fi notificat.</p></div>
              <button onClick={()=>{onUpdate?.()}} className="w-full px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">Gata</button>
            </div>
          )}

          {/* ── DECLINE CONFIRM ── */}
          {mode==='decline_confirm'&&(
            <>
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center"><XCircle className="w-10 h-10 text-red-400 mx-auto mb-3"/><h3 className="font-bold text-red-800">Refuzi acest job?</h3><p className="text-sm text-red-600 mt-1">Această acțiune nu poate fi anulată.</p></div>
              <div className="bg-gray-50 rounded-xl p-4"><p className="text-sm font-semibold text-gray-700 mb-1">{job.title}</p><p className="text-xs text-gray-500">{clientName} · {job.price}</p></div>
            </>
          )}

          {/* ── DECLINE DONE ── */}
          {mode==='decline_done'&&(
            <div className="text-center space-y-5 py-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto"><XCircle className="w-9 h-9 text-gray-400"/></div>
              <div><h2 className="text-xl font-bold text-gray-800">Job Refuzat</h2><p className="text-sm text-gray-500 mt-2">Clientul va fi notificat.</p></div>
              <button onClick={()=>{onUpdate?.()}} className="w-full px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">Înapoi la Pipeline</button>
            </div>
          )}

          {/* ── RESCHEDULE ── */}
          {mode==='reschedule'&&(
            <>
              <div className="text-center">
                <div className="w-14 h-14 bg-blue-50 border-2 border-blue-200 rounded-full flex items-center justify-center mx-auto mb-3"><RefreshCw className="w-6 h-6 text-blue-600"/></div>
                <h3 className="font-bold text-gray-800 text-lg">Reprogramează Job-ul</h3>
                <p className="text-sm text-gray-500 mt-1">Propune o nouă dată/oră clientului. El trebuie să confirme.</p>
              </div>
              {pendingResched&&<div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl"><p className="text-xs font-bold text-yellow-800">Cerere existentă în așteptare</p><p className="text-xs text-yellow-700 mt-0.5">{new Date(pendingResched.proposed_date).toLocaleDateString('ro-RO',{day:'2-digit',month:'long'})} · {pendingResched.proposed_time}</p><p className="text-xs text-yellow-600 mt-1">O nouă cerere o va înlocui pe cea anterioară.</p></div>}
              <div className="bg-gray-50 rounded-xl p-3 text-sm"><p className="text-xs text-gray-400 mb-1">Data curentă:</p><p className="font-semibold text-gray-700">{job.date}</p></div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2"><Calendar className="w-4 h-4 inline mr-1 text-gray-400"/>Noua Dată *</label>
                <input type="date" value={reschedDate}
                  onChange={e => {
                    const d = e.target.value
                    setReschedDate(d)
                    if (d === JRM_TODAY && reschedTime && jrmToMins(reschedTime) <= new Date().getHours() * 60 + new Date().getMinutes()) setReschedTime('')
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"/>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2"><Clock className="w-4 h-4 inline mr-1 text-gray-400"/>Noua Oră *</label>
                <div className="grid grid-cols-4 gap-2">{jrmAvail(reschedDate).map(t=><button key={t} onClick={()=>setReschedTime(t)} className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${reschedTime===t?'bg-blue-600 text-white border-blue-600':'border-gray-200 text-gray-600 hover:border-blue-400'}`}>{t}</button>)}</div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Mesaj <span className="font-normal text-gray-400">(opțional)</span></label>
                <textarea value={reschedMessage} onChange={e=>setReschedMessage(e.target.value)} rows={3} placeholder="Ex: Am o urgență în acea zi..." className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"/>
              </div>
            </>
          )}

          {/* ── DELAY ── */}
          {mode==='delay'&&(
            <>
              <div className="text-center">
                <div className="w-14 h-14 bg-orange-50 border-2 border-orange-200 rounded-full flex items-center justify-center mx-auto mb-3"><AlertTriangle className="w-6 h-6 text-orange-600"/></div>
                <h3 className="font-bold text-gray-800 text-lg">Marchează jobul ca întârziat</h3>
                <p className="text-sm text-gray-500 mt-1">Clientul primește notificare și poate reprograma/anula.</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Motiv (opțional)</label>
                <textarea value={delayReason} onChange={e=>setDelayReason(e.target.value)} rows={3} placeholder="Ex: lucrarea anterioară depășește estimarea" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none text-sm"/>
              </div>
            </>
          )}

          {/* ── RESCHEDULE DONE ── */}
          {mode==='reschedule_done'&&(
            <div className="text-center space-y-5 py-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto"><CalendarClock className="w-9 h-9 text-blue-600"/></div>
              <div><h2 className="text-xl font-bold text-gray-800">Cerere Trimisă!</h2><p className="text-sm text-gray-500 mt-2">Clientul va confirma noua programare:<br/><strong className="text-gray-700">{reschedDate&&new Date(reschedDate).toLocaleDateString('ro-RO',{day:'2-digit',month:'long',year:'numeric'})} · {reschedTime}</strong></p></div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-left text-sm text-blue-800 space-y-1.5"><p>✓ Clientul va confirma sau refuza</p><p>✓ Vei fi notificat când răspunde</p><p>✓ Data originală rămâne activă până la confirmare</p></div>
              <button onClick={()=>{onUpdate?.()}} className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">Înapoi la Pipeline</button>
            </div>
          )}

          {/* ── C1 robot ── */}
          {mode==='c1'&&(
            <>
              <ProgressDots mode="c1"/>
              <div className="text-center"><div className="w-14 h-14 bg-green-50 border-2 border-green-200 rounded-full flex items-center justify-center mx-auto mb-3"><CheckCircle className="w-7 h-7 text-green-600"/></div><h3 className="font-bold text-gray-800 text-lg">Marchezi job-ul ca finalizat?</h3><p className="text-sm text-gray-500 mt-1.5">Această acțiune este <span className="font-semibold text-gray-700">ireversibilă</span>.</p></div>
              <div className="bg-gray-50 rounded-xl p-4 text-sm"><p className="font-semibold text-gray-700">{job.title}</p><p className="text-gray-500">{clientName}</p></div>
              <RobotCheckbox onVerified={()=>setMode('c2')}/>
            </>
          )}

          {/* ── C2 phrase ── */}
          {mode==='c2'&&(
            <>
              <ProgressDots mode="c2"/>
              <div className="text-center"><h3 className="font-bold text-gray-800 text-lg">Confirmare suplimentară</h3><p className="text-sm text-gray-500 mt-1.5">Introdu exact fraza de mai jos</p></div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center"><p className="text-xs text-blue-500 font-medium uppercase tracking-wide mb-2">Fraza de confirmare</p><p className="text-2xl font-bold text-blue-700 tracking-widest select-none">{phrase}</p></div>
              <div>
                <input type="text" value={phraseInput} onChange={e=>{setPhraseInput(e.target.value);setPhraseError(false)}} placeholder="Introdu fraza exactă..." onKeyDown={e=>e.key==='Enter'&&handlePhraseSubmit()}
                  className={`w-full px-4 py-3 border rounded-xl text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 uppercase ${phraseError?'border-red-400 focus:ring-red-400 bg-red-50':'border-gray-300 focus:ring-blue-500'}`}/>
                {phraseError&&<p className="text-xs text-red-600 text-center mt-1.5">Fraza introdusă nu este corectă.</p>}
              </div>
            </>
          )}

          {/* ── C3 photos ── */}
          {mode==='c3'&&(
            <>
              <ProgressDots mode="c3"/>
              <div className="text-center"><h3 className="font-bold text-gray-800 text-lg">Adaugă dovezi foto</h3><p className="text-sm text-gray-500 mt-1.5">Obligatoriu — cel puțin o poză</p></div>
              {compPhotos.length>0?(
                <div className="grid grid-cols-3 gap-2">
                  {compPhotos.map(({previewUrl},idx)=><div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group"><img src={previewUrl} alt="" className="w-full h-full object-cover"/><button onClick={()=>handleRemovePhoto(idx)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><Trash2 className="w-3 h-3"/></button></div>)}
                  {compPhotos.length<6&&<button onClick={()=>fileInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition"><ImagePlus className="w-6 h-6 text-gray-400"/></button>}
                </div>
              ):(
                <button onClick={()=>fileInputRef.current?.click()} className="w-full h-40 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition"><Upload className="w-8 h-8 text-gray-400"/><p className="text-sm font-medium text-gray-500">Apasă sau fotografiază lucrarea</p><p className="text-xs text-gray-400">JPG, PNG · max 6 poze</p></button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" multiple capture="environment" onChange={handleAddPhotos} className="hidden"/>
              <div><label className="block text-sm font-bold text-gray-700 mb-2">Descriere <span className="font-normal text-gray-400">(opțional)</span></label><textarea value={compDesc} onChange={e=>setCompDesc(e.target.value)} rows={3} placeholder="Ex: Am înlocuit circuitul defect..." className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"/></div>
            </>
          )}

          {/* ── C4 done ── */}
          {mode==='c4'&&(
            <div className="text-center space-y-5 py-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle className="w-10 h-10 text-green-600"/></div>
              <div><h2 className="text-2xl font-bold text-gray-800">Job Finalizat!</h2><p className="text-sm text-gray-500 mt-2">Lucrarea a fost marcată cu succes.</p></div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left space-y-1.5 text-sm text-green-800"><p>✓ Dovezile foto au fost salvate</p><p>✓ Clientul va confirma lucrarea</p><p>✓ Plata procesată în 24h după confirmare</p></div>
              <button onClick={()=>{onUpdate?.()}} className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition">Înapoi la Pipeline</button>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        {!['accept_done','decline_done','c1','c4','reschedule_done'].includes(mode)&&(
          <div className="flex items-center gap-3 p-5 border-t border-gray-100 flex-shrink-0">
            {mode==='details'&&job.uiStatus==='new'&&<>
              <button onClick={()=>{setConfirmText('');setMode('confirm_accept')}} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition"><CheckCircle className="w-4 h-4"/>Acceptă</button>
              <button onClick={()=>setMode('decline_confirm')} className="flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"><XCircle className="w-4 h-4"/>Refuză</button>
              {canReschedule&&<button onClick={()=>setMode('reschedule')} className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-xl text-gray-400 hover:text-blue-600 hover:border-blue-300 transition" title="Reprogramează"><CalendarClock className="w-4 h-4"/></button>}
            </>}
            {mode==='details'&&job.uiStatus==='accepted'&&<>
              <button onClick={()=>setMode('reschedule')} className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-blue-200 rounded-xl text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition"><CalendarClock className="w-4 h-4"/>Reprogramează</button>
              <button onClick={()=>{onClose?.();navigate(`/handyman/messages?${job._type}_id=${job._id}`)}} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 border border-blue-200 rounded-xl text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition"><MessageSquare className="w-4 h-4"/>Mesaj</button>
            </>}
            {mode==='details'&&job.uiStatus==='in_progress'&&(
              <>
                <button onClick={()=>setMode('c1')} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition"><CheckCircle className="w-4 h-4"/>Marchează Finalizat</button>
                <button onClick={()=>setMode('delay')} className="px-4 py-2.5 border border-orange-200 text-orange-700 bg-orange-50 rounded-xl text-sm font-medium hover:bg-orange-100 transition">Întârziat</button>
              </>
            )}
            {mode==='details'&&isDelayed&&(
              <>
                <button onClick={handleResumeFromDelay} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-60">{saving?<Loader2 className="w-4 h-4 animate-spin"/>:<RefreshCw className="w-4 h-4"/>}Reia Lucrarea</button>
              </>
            )}
            {mode==='confirm_accept'&&<>
              <button onClick={()=>setMode('details')} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Înapoi</button>
              <button onClick={()=>{setConfirmText('');setMode('summary')}} disabled={confirmText!==CONFIRM_WORD} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed">Continuă →</button>
            </>}
            {mode==='summary'&&<>
              <button onClick={()=>setMode('confirm_accept')} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Înapoi</button>
              <button onClick={handleAccept} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-60">{saving?<Loader2 className="w-4 h-4 animate-spin"/>:<CheckCircle className="w-4 h-4"/>}Confirmă programarea</button>
            </>}
            {mode==='decline_confirm'&&<>
              <button onClick={()=>setMode('details')} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Anulează</button>
              <button onClick={handleDecline} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition disabled:opacity-60">{saving?<Loader2 className="w-4 h-4 animate-spin"/>:<XCircle className="w-4 h-4"/>}Da, Refuză</button>
            </>}
            {mode==='reschedule'&&<>
              <button onClick={()=>setMode('details')} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Înapoi</button>
              <button onClick={handleReschedule} disabled={saving||!reschedDate||!reschedTime} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">{saving?<Loader2 className="w-4 h-4 animate-spin"/>:<CalendarClock className="w-4 h-4"/>}Trimite Cererea</button>
            </>}
            {mode==='delay'&&<>
              <button onClick={()=>setMode('details')} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Înapoi</button>
              <button onClick={handleMarkDelayed} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 transition disabled:opacity-50">{saving?<Loader2 className="w-4 h-4 animate-spin"/>:<AlertTriangle className="w-4 h-4"/>}Confirmă Întârzierea</button>
            </>}
            {mode==='c2'&&<>
              <button onClick={()=>setMode('c1')} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Înapoi</button>
              <button onClick={handlePhraseSubmit} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">Verifică Fraza</button>
            </>}
            {mode==='c3'&&<>
              <button onClick={()=>setMode('c2')} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Înapoi</button>
              <button onClick={handleCompleteJob} disabled={saving||compPhotos.length===0} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition disabled:opacity-60">{saving?<><Loader2 className="w-4 h-4 animate-spin"/>{uploadProgress?'Se încarcă...':'Se salvează...'}</>:<><CheckCircle className="w-4 h-4"/>Finalizează Job-ul</>}</button>
            </>}
          </div>
        )}
      </div>
    </div>
  )
}
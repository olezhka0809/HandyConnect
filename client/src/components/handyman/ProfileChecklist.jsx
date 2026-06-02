import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase'
import { CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

export default function ProfileChecklist({ userId, compact = false }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen]       = useState(!compact)
  const navigate              = useNavigate()

  useEffect(() => {
    if (!userId) return
    async function load() {
      const [profileRes, hpRes, verRes, skillRes] = await Promise.all([
        supabase.from('profiles').select('first_name, phone, city, avatar_url, onboarding_completed').eq('id', userId).single(),
        supabase.from('handyman_profiles').select('bio, available_days, work_radius_km').eq('user_id', userId).maybeSingle(),
        supabase.from('verifications').select('type, status').eq('user_id', userId),
        supabase.from('user_skills').select('id, status').eq('user_id', userId),
      ])
      setData({
        profile:       profileRes.data,
        hp:            hpRes.data,
        verifications: verRes.data || [],
        userSkills:    skillRes.data || [],
      })
      setLoading(false)
    }
    load()
  }, [userId])

  if (loading) return null
  if (!data)   return null

  const { profile, hp, verifications, userSkills } = data

  const getVerifStatus = (type) => {
    const v = verifications.find(v => v.type === type)
    if (!v) return 'missing'
    return v.status === 'approved' ? 'done' : v.status === 'pending' ? 'pending' : 'rejected'
  }

  const hasApprovedSkill = userSkills.some(s => s.status === 'approved')
  const hasSkillPending  = userSkills.some(s => s.status === 'pending')
  const hasSkillDraft    = userSkills.some(s => s.status === 'draft')
  const hasSkillSelected = userSkills.length > 0
  const skillStatus      = hasApprovedSkill ? 'done' : (hasSkillDraft || hasSkillSelected) ? 'pending' : 'missing'
  const evidenceStatus   = hasApprovedSkill ? 'done' : hasSkillPending ? 'pending' : 'missing'

  const idStatus     = getVerifStatus('identity')
  const cazierStatus = getVerifStatus('criminal_record')

  const go = (section) => navigate('/handyman/personal-profile', { state: { section } })

  const checks = [
    {
      id: 'basic',
      label: 'Date personale complete',
      description: 'Nume, telefon și oraș completate',
      status: (profile?.first_name && profile?.phone && profile?.city) ? 'done' : 'missing',
      section: 'account',
      linkLabel: 'Completează',
    },
    {
      id: 'schedule',
      label: 'Program disponibilitate setat',
      description: 'Minim o zi disponibilă în program',
      status: (hp?.available_days?.length > 0) ? 'done' : 'missing',
      section: 'schedule',
      linkLabel: 'Setează program',
    },
    {
      id: 'skill',
      label: 'Minim 1 skill selectat',
      description: hasApprovedSkill
        ? 'Skill aprobat — excelent!'
        : hasSkillPending
        ? 'Skill trimis la verificare — în așteptarea aprobării'
        : hasSkillDraft
        ? 'Skill selectat — adaugă o dovadă și trimite la verificare'
        : 'Niciun skill selectat',
      status: skillStatus,
      section: 'skills',
      linkLabel: hasSkillSelected ? 'Gestionează skills' : 'Adaugă skill',
    },
    {
      id: 'skill_evidence',
      label: 'Dovadă skill trimisă la verificare',
      description: hasApprovedSkill
        ? 'Dovadă aprobată'
        : hasSkillPending
        ? 'Dovadă în așteptarea verificării admin'
        : hasSkillDraft
        ? 'Skill selectat — încă nu ai trimis dovada'
        : 'Adaugă un skill și încarcă o dovadă',
      status: evidenceStatus,
      section: 'skills',
      linkLabel: 'Uploadează dovadă',
    },
    {
      id: 'identity',
      label: 'Carte de identitate verificată',
      description: idStatus === 'done'
        ? 'Identitate aprobată'
        : idStatus === 'pending'
        ? 'Document în așteptarea verificării'
        : 'CI neîncărcată',
      status: idStatus,
      section: 'verification',
      linkLabel: idStatus === 'missing' ? 'Uploadează CI' : 'Vezi status',
    },
    {
      id: 'cazier',
      label: 'Cazier judiciar verificat',
      description: cazierStatus === 'done'
        ? 'Cazier aprobat'
        : cazierStatus === 'pending'
        ? 'Document în așteptarea verificării'
        : 'Cazier neîncărcat',
      status: cazierStatus,
      section: 'verification',
      linkLabel: cazierStatus === 'missing' ? 'Uploadează cazier' : 'Vezi status',
    },
  ]

  const doneCount  = checks.filter(c => c.status === 'done').length
  const totalCount = checks.length
  const pct        = Math.round((doneCount / totalCount) * 100)

  const barColor = pct === 100 ? 'bg-green-500' : pct >= 60 ? 'bg-blue-500' : 'bg-amber-400'

  const statusIcon = (status) => {
    if (status === 'done')     return <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
    if (status === 'pending')  return <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
    if (status === 'rejected') return <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
    return <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
  }

  const statusText = (status) => {
    if (status === 'done')     return 'text-gray-700'
    if (status === 'pending')  return 'text-amber-700'
    if (status === 'rejected') return 'text-red-700'
    return 'text-gray-400'
  }

  if (compact) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button onClick={() => setOpen(o => !o)}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-bold text-gray-700">Progres spre Nivel 2</span>
              <span className={`text-sm font-black ${pct === 100 ? 'text-green-600' : pct >= 60 ? 'text-blue-600' : 'text-amber-500'}`}>
                {doneCount}/{totalCount}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="text-gray-400 flex-shrink-0">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {open && (
          <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
            {checks.map(check => (
              <div key={check.id} className="flex items-start gap-2.5">
                {statusIcon(check.status)}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${statusText(check.status)}`}>{check.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{check.description}</p>
                </div>
                {check.status !== 'done' && (
                  <button onClick={() => go(check.section)}
                    className="text-xs text-blue-600 hover:underline font-medium flex-shrink-0">
                    {check.linkLabel}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-800">Progres spre Nivel 2 — Meșter Verificat</h3>
          <p className="text-sm text-gray-500 mt-0.5">Completează toate condițiile pentru a-ți debloca accesul la taskuri</p>
        </div>
        <span className={`text-2xl font-black ${pct === 100 ? 'text-green-600' : pct >= 60 ? 'text-blue-600' : 'text-amber-500'}`}>
          {pct}%
        </span>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2.5 mb-5">
        <div className={`h-2.5 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>

      <div className="space-y-3">
        {checks.map(check => (
          <div key={check.id}
            className={`flex items-start gap-3 p-3 rounded-xl border
              ${check.status === 'done'     ? 'bg-green-50 border-green-100' :
                check.status === 'pending'  ? 'bg-amber-50 border-amber-100' :
                check.status === 'rejected' ? 'bg-red-50 border-red-100' :
                'bg-gray-50 border-gray-100'}`}>
            {statusIcon(check.status)}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${statusText(check.status)}`}>{check.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{check.description}</p>
            </div>
            {check.status !== 'done' && (
              <button onClick={() => go(check.section)}
                className="text-xs text-blue-600 hover:underline font-medium flex-shrink-0 mt-0.5">
                {check.linkLabel} →
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

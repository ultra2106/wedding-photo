{/* ランキングタブ */}
      {activeTab === 'ranking' && (
        <div style={{ padding: '12px 14px' }}>

          {/* ランキング種別タブ */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto' }}>
            {[
              { id: 'total', label: '🏆 総合' },
              { id: '❤️',   label: '❤️ ランキング' },
              { id: '👏',   label: '👏 ランキング' },
              { id: '😆',   label: '😆 ランキング' },
            ].map(t => (
              <button key={t.id} onClick={() => setRankingFilter(t.id)} style={{
                padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                whiteSpace: 'nowrap', fontSize: 13, fontWeight: rankingFilter === t.id ? 'bold' : 'normal',
                background: rankingFilter === t.id ? '#f9a825' : '#f0f0f0',
                color: rankingFilter === t.id ? 'white' : '#666',
                flexShrink: 0,
              }}>{t.label}</button>
            ))}
          </div>

          {/* ランキングヘッダー */}
          <div style={{ background: 'linear-gradient(90deg,#f9a825,#fb8c00)', borderRadius: 14, padding: '12px 16px', marginBottom: 14, color: 'white' }}>
            <div style={{ fontWeight: 'bold', fontSize: 15 }}>
              {rankingFilter === 'total' ? '🏆 総合ランキング TOP5' :
               rankingFilter === '❤️' ? '❤️ ランキング TOP5' :
               rankingFilter === '👏' ? '👏 ランキング TOP5' :
               '😆 ランキング TOP5'}
            </div>
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
              {rankingFilter === 'total' ? '全リアクション合計順' : `${rankingFilter} の数順`}
            </div>
          </div>

          {/* ランキングリスト */}
          {(() => {
            // フィルターに応じてソート
            const ranked = [...photos]
              .map(p => {
                const { total, detail } = getReactionSummary(p.id)
                const score = rankingFilter === 'total'
                  ? total
                  : (detail[rankingFilter] || []).length
                return { ...p, score, detail, total }
              })
              .filter(p => p.score > 0)
              .sort((a, b) => b.score - a.score)
              .slice(0, 5)

            if (ranked.length === 0) return (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#ccc' }}>
                <div style={{ fontSize: 36 }}>🏆</div>
                <div style={{ marginTop: 8 }}>まだリアクションがありません</div>
              </div>
            )

            const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']
            return ranked.map((p, idx) => {
              const isFav = favorites.includes(p.id)
              return (
                <div key={p.id} onClick={() => openLightbox(p)} style={{ background: 'white', borderRadius: 16, padding: 14, marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center', border: isFav ? '2px solid #f9a825' : 'none' }}>
                  <div style={{ fontSize: 28, flexShrink: 0 }}>{medals[idx]}</div>
                  <img src={p.url} style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 'bold', fontSize: 13, color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.caption}</div>
                    <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>{p.nick}</div>

                    {/* 種類別リアクション */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                      {REACTIONS.map(r => {
                        const count = (p.detail[r] || []).length
                        if (count === 0) return null
                        return (
                          <span key={r} style={{
                            fontSize: 12, borderRadius: 20, padding: '2px 8px',
                            background: rankingFilter === r ? '#fff8e1' : '#f5f5f5',
                            color: rankingFilter === r ? '#f9a825' : '#666',
                            fontWeight: rankingFilter === r ? 'bold' : 'normal',
                            border: rankingFilter === r ? '1px solid #f9a825' : 'none',
                            display: 'flex', alignItems: 'center', gap: 2,
                          }}>
                            {r} <span style={{ fontWeight: 'bold' }}>{count}</span>
                          </span>
                        )
                      })}
                    </div>

                    {/* スコア表示 */}
                    <div style={{ fontSize: 12, color: '#f9a825', fontWeight: 'bold' }}>
                      {rankingFilter === 'total'
                        ? `合計 ${p.total} リアクション`
                        : `${rankingFilter} ${p.score}件`
                      }
                    </div>
                  </div>

                  {/* お気に入りボタン */}
                  <button onClick={e => { e.stopPropagation(); toggleFavorite(p.id) }} disabled={togglingFav === p.id}
                    style={{ background: isFav ? '#fff8e1' : 'white', border: `1.5px solid ${isFav ? '#f9a825' : '#eee'}`, color: isFav ? '#f9a825' : '#aaa', padding: '5px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: isFav ? 'bold' : 'normal', flexShrink: 0 }}>
                    {isFav ? '⭐' : '☆'}
                  </button>
                </div>
              )
            })
          })()}

          {/* ベスト写真まとめ */}
          {favorites.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 10 }}>⭐ 選んだベスト写真（{favorites.length}枚）</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                {photos.filter(p => favorites.includes(p.id)).map(p => (
                  <div key={p.id} onClick={() => openLightbox(p)} style={{ borderRadius: 10, overflow: 'hidden', cursor: 'pointer', border: '2px solid #f9a825', position: 'relative' }}>
                    <img src={p.url} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                    {/* リアクション合計 */}
                    {getReactionSummary(p.id).total > 0 && (
                      <div style={{ position: 'absolute', bottom: 3, right: 3, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 10, borderRadius: 8, padding: '1px 5px' }}>
                        {getReactionSummary(p.id).total}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

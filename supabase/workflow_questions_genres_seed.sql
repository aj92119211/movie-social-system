-- 互動問答題庫：各電影類型 100 則 seed
-- 使用方式：Supabase Dashboard -> SQL Editor -> New query -> 貼上本檔內容 -> Run
-- 本檔可重複執行：會用固定 id 檢查，已存在的題目不會重複新增。

insert into public.workflow_collections (kind, data)
values ('questions', '[]'::jsonb)
on conflict (kind) do nothing;

with genre_settings(slug, movie_genre, hook, material, mood) as (
  values
    ('horror', '恐怖', '讓人背脊發涼的線索', '詭異劇照', '神祕'),
    ('romance', '愛情', '讓人心動又揪心的瞬間', '角色互動照', '感性'),
    ('comedy', '喜劇', '讓人忍不住想分享的笑點', '趣味花絮', '幽默'),
    ('drama', '劇情', '最貼近人心的選擇', '情緒劇照', '溫暖'),
    ('action', '動作', '最熱血的高能場面', '動作場面照', '熱血'),
    ('mystery', '懸疑', '越想越不對勁的細節', '線索劇照', '懸疑')
),
seed as (
  select
    genre_settings.*,
    generate_series as seed_no,
    ((generate_series - 1) % 10) + 1 as template_no,
    (array['開放問答', '二選一', '投票', '測驗', '留言引導', 'Reels 字卡'])[((generate_series - 1) % 6) + 1] as question_type,
    (array['IG 限動', 'Threads', 'Facebook', 'Reels'])[((generate_series - 1) % 4) + 1] as platform,
    (array['前導期', '預告上線', '上映倒數', '上映中', '口碑擴散'])[((generate_series - 1) % 5) + 1] as phase
  from genre_settings
  cross join generate_series(1, 100)
),
prepared as (
  select jsonb_build_object(
    'id', format('q-genre-%s-%s', slug, lpad(seed_no::text, 3, '0')),
    'content',
      case template_no
        when 1 then format('看到這個%s，你第一個想到的問題是什麼？', hook)
        when 2 then format('如果只能用一個詞形容這支%s，你會選哪一個？', movie_genre)
        when 3 then format('你覺得這張%s背後，最可能藏著什麼故事？', material)
        when 4 then format('如果你是主角，遇到這種%s，你會衝上去還是先觀察？', hook)
        when 5 then format('這次%s最吸引你的地方是角色、氣氛，還是反轉？', movie_genre)
        when 6 then format('看完預告後，你會把這部%s推薦給哪一種朋友？', movie_genre)
        when 7 then format('如果要幫這部%s取一句社群短標，你會怎麼寫？', movie_genre)
        when 8 then format('哪一個%s畫面最適合做成限動投票？', material)
        when 9 then format('你希望下一波釋出更多%s、角色介紹，還是幕後花絮？', material)
        else format('用一個 emoji 形容你對這部%s的期待，會是哪一個？', movie_genre)
      end,
    'movieId', '',
    'movieGenre', movie_genre,
    'type', question_type,
    'platform', platform,
    'tone', mood,
    'phase', phase,
    'status', '可使用',
    'cta',
      case question_type
        when '投票' then '投票告訴我們你的選擇'
        when '二選一' then '留言選 A 或 B'
        when '測驗' then '留言你的答案，晚點公布解析'
        when '留言引導' then '留言告訴我們你的看法'
        else '回覆或留言告訴我們'
      end,
    'asset', material,
    'uses', 0,
    'lastUsed', '',
    'performance', '未測試',
    'note', format('各類型電影互動問答 seed：%s，第 %s 題。可依實際電影名稱再微調。', movie_genre, seed_no),
    'createdAt', to_char(current_date, 'YYYY/MM/DD')
  ) as item
  from seed
),
existing as (
  select value as item
  from public.workflow_collections wc
  cross join lateral jsonb_array_elements(wc.data) value
  where wc.kind = 'questions'
),
new_items as (
  select prepared.item
  from prepared
  where not exists (
    select 1
    from existing
    where existing.item->>'id' = prepared.item->>'id'
  )
)
update public.workflow_collections wc
set data = wc.data || coalesce((select jsonb_agg(item order by item->>'id') from new_items), '[]'::jsonb),
    updated_at = now()
where wc.kind = 'questions';

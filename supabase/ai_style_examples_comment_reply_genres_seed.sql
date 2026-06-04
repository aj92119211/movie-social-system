-- Seed 500 AI style examples for editor comment replies.
-- Scope: all movie genres except 動作, because 動作 examples already exist.
-- Result: 100 rows each for 恐怖、愛情、喜劇、劇情、懸疑.
-- Safe to run more than once: rows are skipped when the same genre/use_case already exists.

with genre_settings(movie_genre, tone_options, angle_options) as (
  values
    (
      '恐怖',
      array['神祕但親切', '懸疑小編感', '克制驚悚', '陪觀眾壯膽', '不爆雷引導'],
      array['氣氛', '膽量', '謎團', '聲音', '黑暗', '角色反應', '反轉', '同行觀影', '預告線索', '觀後討論']
    ),
    (
      '愛情',
      array['溫柔共感', '甜而不膩', '成熟浪漫', '輕盈口語', '療癒陪伴'],
      array['心動', '錯過', '告白', '陪伴', '距離', '遺憾', '重逢', '選擇', '曖昧', '觀後餘韻']
    ),
    (
      '喜劇',
      array['幽默自然', '玩梗但不尷尬', '輕鬆小編感', '朋友聊天感', '吐槽式互動'],
      array['笑點', '角色反差', '朋友揪團', '台詞梗', '放鬆', '社群迷因', '荒謬感', '解壓', '觀眾共鳴', '二刷笑點']
    ),
    (
      '劇情',
      array['細膩真誠', '成熟白話', '安靜有力', '情緒共感', '溫柔觀察'],
      array['人生選擇', '角色弧線', '家庭關係', '內心轉折', '沉默', '餘韻', '現實感', '共感', '細節', '觀後沉澱']
    ),
    (
      '懸疑',
      array['冷靜神祕', '線索感', '推理小編感', '克制挑逗', '疑問引導'],
      array['線索', '真相', '不可靠視角', '伏筆', '猜測', '證據', '反轉', '角色動機', '謎團', '觀眾推理']
    )
),
seed as (
  select
    genre_settings.movie_genre,
    series.n,
    (array['IG', 'FB', 'Threads', 'YouTube', '通用'])[((series.n - 1) % 5) + 1] as platform,
    (array['上映前', '上映中', '下檔前', '口碑期', '通用'])[((series.n - 1) % 5) + 1] as campaign_stage,
    genre_settings.tone_options[((series.n - 1) % array_length(genre_settings.tone_options, 1)) + 1] as tone,
    genre_settings.angle_options[((series.n - 1) % array_length(genre_settings.angle_options, 1)) + 1] as angle,
    ((series.n - 1) % 10) + 1 as template_no,
    case
      when series.n % 5 = 0 then 5
      when series.n % 3 = 0 then 4
      else 3
    end as score
  from genre_settings
  cross join generate_series(1, 100) as series(n)
),
prepared as (
  select
    '留言回覆' as type,
    platform,
    movie_genre,
    campaign_stage,
    tone,
    case template_no
      when 1 then format('懂你說的那個「%s」感，這也是這部%s片最想留給觀眾慢慢咀嚼的地方。', angle, movie_genre)
      when 2 then format('這個觀察很準，%s不是只看表面情節，很多細節其實都藏在角色反應裡。', angle)
      when 3 then format('先不爆雷，但你抓到的%s真的很關鍵，等更多人看完應該會有一波討論。', angle)
      when 4 then format('這個留言好適合拿來問大家：如果是你遇到%s，會怎麼選？', angle)
      when 5 then format('我們也很喜歡這個%s切入點，短短一句就把%s片的情緒說出來了。', angle, movie_genre)
      when 6 then format('這種感覺很值得二刷再看一次，尤其是%s相關的細節，前後呼應會更明顯。', angle)
      when 7 then format('你這句很有畫面，剛好也是這部%s片想讓觀眾帶著問題走出戲院的地方。', movie_genre)
      when 8 then format('可以先把這個%s留在心裡，等看完正片再回來對答案，會更有感。', angle)
      when 9 then format('這個角度很小編私心推，因為%s通常就是觀眾最容易開始討論的地方。', angle)
      else format('不急著下結論，這部%s片有趣的地方就是每個人都會從%s看到不同答案。', movie_genre, angle)
    end as example_content,
    case template_no
      when 1 then '先接住觀眾情緒，再把討論拉回電影特色，適合增加留言延伸。'
      when 2 then '肯定觀眾觀察，讓留言者覺得被理解，也能帶出細節討論。'
      when 3 then '保留神祕感與不爆雷原則，適合未看觀眾也能參與。'
      when 4 then '把單一留言轉成開放問題，有助於吸引更多觀眾回覆。'
      when 5 then '用短句共感建立品牌語氣，適合回覆稱讚或心得。'
      when 6 then '引導二刷與細節觀察，適合口碑期或上映中使用。'
      when 7 then '把觀眾留言升級成觀影討論，提升內容深度。'
      when 8 then '用「回來對答案」創造後續互動，不直接透露劇情。'
      when 9 then '用小編視角帶出討論點，語氣自然不僵硬。'
      else '鼓勵多元解讀，適合劇情、懸疑或情緒型討論。'
    end as why_it_works,
    case
      when platform = 'IG' then '適合回覆 IG 留言，可搭配限動問答延伸互動。'
      when platform = 'FB' then '適合 Facebook 留言串，可引導觀眾分享長一點的心得。'
      when platform = 'Threads' then '適合 Threads 對話感回覆，可用來開啟二次討論。'
      when platform = 'YouTube' then '適合 YouTube 預告或花絮留言，語氣可更直接回應觀眾觀察。'
      else '適合跨平台通用回覆，可依留言長度微調。'
    end as usage_note,
    array[
      '適合留言回覆',
      movie_genre,
      campaign_stage,
      case when platform = '通用' then '跨平台' else platform end
    ] as quality_tags,
    format('產生小編留言回覆｜%s｜seed-%s', movie_genre, lpad(n::text, 3, '0')) as use_case,
    true as is_active,
    score,
    '模仿語氣、節奏與回覆策略，不要直接複製原句；依實際留言重新生成。' as ai_instruction
  from seed
)
insert into public.ai_style_examples (
  type,
  platform,
  movie_genre,
  campaign_stage,
  tone,
  example_content,
  why_it_works,
  usage_note,
  quality_tags,
  use_case,
  is_active,
  score,
  ai_instruction
)
select
  type,
  platform,
  movie_genre,
  campaign_stage,
  tone,
  example_content,
  why_it_works,
  usage_note,
  quality_tags,
  use_case,
  is_active,
  score,
  ai_instruction
from prepared
where not exists (
  select 1
  from public.ai_style_examples existing
  where existing.type = prepared.type
    and existing.movie_genre = prepared.movie_genre
    and existing.use_case = prepared.use_case
);

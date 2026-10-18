-- DEVELOPMENT ONLY. Three clearly labelled sample articles so you can see Phase 2 working.
-- Needs at least one user: Supabase dashboard > Authentication > Add user (the signup trigger creates the profile).
-- The text is generic writing advice, not research. It contains no invented studies, quotes or statistics.
-- Delete these rows before launch: delete from public.articles where title like '[SAMPLE]%';

insert into public.articles (author_id, slug, title, subtitle, summary, body, category_id, language, status, published_at)
select p.id, v.slug, v.title, v.subtitle, v.summary, v.body,
       (select id from public.categories where slug = v.cat), v.lang, 'published', now()
from (select id from public.profiles order by created_at limit 1) p
cross join (values
  ('sample-how-to-read-an-article', '[SAMPLE] How to read an article critically', 'A short checklist for curious readers',
   'Sample content for development. Three habits that make any article easier to evaluate.',
$md$## Start with the claim

Before reading the details, write down in one sentence what the author says is true.

## Look for the evidence

Ask what the author offers in support: data, a source you can check, or only opinion. A claim with no source is a starting point for your own questions, not a conclusion.

### Check the sources yourself

Follow at least one reference to its origin. Notice whether it really says what the article says it does.

## Keep your own notes

| Question | Why it matters |
| --- | --- |
| What is the claim? | Keeps you focused |
| What supports it? | Separates evidence from opinion |

> Reading slowly is not a weakness. It is how understanding is built.

*This is sample content created for development.*$md$,
   'education', 'en'),
  ('sample-hoc-cach-ghi-chu', '[SAMPLE] Cách ghi chép khi đọc một bài viết', 'Ba thói quen đơn giản',
   'Nội dung mẫu cho giai đoạn phát triển. Ba thói quen giúp bạn nhớ và hiểu bài đọc lâu hơn.',
$md$## Viết lại ý chính bằng lời của bạn

Sau mỗi phần, hãy dừng lại và viết một câu tóm tắt mà không nhìn vào bài.

## Ghi lại câu hỏi

Những điều bạn chưa hiểu là điểm bắt đầu tốt cho lần đọc tiếp theo.

## Chia sẻ lại với người khác

Giải thích cho một người bạn là cách kiểm tra xem mình đã thật sự hiểu hay chưa.

*Đây là nội dung mẫu được tạo cho giai đoạn phát triển.*$md$,
   'education', 'vi'),
  ('sample-organiser-ses-lectures', '[SAMPLE] Organiser ses lectures de la semaine', 'Un petit plan pour lire régulièrement',
   'Contenu d''exemple pour le développement. Une méthode simple pour lire un peu chaque jour.',
$md$## Choisir un moment fixe

Quinze minutes à la même heure valent mieux qu'une longue séance irrégulière.

## Garder une liste

Notez les articles que vous voulez lire, puis rayez-les au fur et à mesure.

*Ceci est un contenu d'exemple créé pour le développement.*$md$,
   'general', 'fr')
) as v(slug, title, subtitle, summary, body, cat, lang)
on conflict (slug) do nothing;

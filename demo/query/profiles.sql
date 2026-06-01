create table profiles ( 
id uuid primary key references auth.users(id), 
nickname text not null, avatar text, 
signature text, 
role text not null default 'user', --user/admin 
exp integer not null default 0, 
created_at timestamptz default now(), 
updated_at timestamptz default now(),
last_checkin_date date --上次签到时间
);
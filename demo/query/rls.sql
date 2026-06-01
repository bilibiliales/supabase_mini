alter policy "users_can_view_self"
on "public"."profiles"
to authenticated
using (
  (auth.uid() = id)
);
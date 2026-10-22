<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Store reusable reception contacts separately from campus people; registration upserts by normalized name and preserves an existing phone when none is provided, so hosts need no CI or campus role.
- Merge saved reception contacts with staff for registration suggestions; saved contact phones take precedence to reuse the most recently supplied number.
- Keep record administration in the authenticated Datos module using the existing staff permissions; paginate database reads for complete exports and share schema validation between forms and file imports to prevent inconsistent writes.
